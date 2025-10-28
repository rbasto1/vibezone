import "server-only";

import { generateId } from "ai";
import { and, asc, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import type { Model } from "@/db/schema";
import {
  chats,
  models,
  newsArticles,
  preferences as preferencesTable,
  projects as projectsTable,
  userStats as userStatsTable,
} from "@/db/schema";
import { models as modelsList } from "@/generated/models";
import {
  DEFAULT_PROJECT_COLOR,
  MAX_PANELS,
  NEWS_WINDOW_MS,
} from "@/lib/constants";
import type { ProjectConfig } from "@/store/projects";
import type { ThreadMessageLike } from "@assistant-ui/react";
import type { User } from "@clerk/nextjs/server";

export async function GetUserModels(userId: string | undefined) {
  let lastModels: string[] = [];
  const hiddenProviders = new Set<string>();

  if (userId) {
    const [
      { lastModels: userLastModels, hiddenProviders: userHiddenProviders } = {},
    ] = await db
      .select({
        lastModels: preferencesTable.lastModels,
        hiddenProviders: preferencesTable.preferenceHiddenProviders,
      })
      .from(preferencesTable)
      .where(eq(preferencesTable.userId, userId))
      .limit(1);

    lastModels = userLastModels ?? [];
    for (const providerId of userHiddenProviders ?? []) {
      hiddenProviders.add(providerId);
    }
  }
  return { lastModels, hiddenProviders };
}

export async function getUserPreferredModels(
  lastModels: string[] | null | undefined,
  hiddenProviders: Set<string>
) {
  if (!lastModels?.length) return null;

  // Fetch only existing chat models, keep user order and limit to MAX_PANELS
  const candidates = await db
    .select({ id: models.id, providerId: models.providerId })
    .from(models)
    .where(
      and(
        inArray(models.id, lastModels),
        isNull(models.deletedAt),
        isNull(models.hiddenAt),
        eq(models.isChat, true)
      )
    );
  const byId = new Map(candidates.map((m) => [m.id, m]));
  const ordered = lastModels
    .map((id) => byId.get(id))
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .filter((model) => !hiddenProviders.has(model.providerId))
    .slice(0, MAX_PANELS);
  if (!ordered.length) {
    return null;
  }

  return ordered;
}

let defaultModelsCache: Pick<Model, "id" | "providerId">[] | null = null;
export function getDefaultModels() {
  defaultModelsCache ??= modelsList.models
    .filter((m) => !!m.priority)
    .toSorted((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    .slice(0, 1);
  return defaultModelsCache;
}

export const buildInitialMessages = (
  prompt: string | null | undefined
): ThreadMessageLike[] => {
  if (!prompt) return [];
  return [
    {
      id: generateId(),
      role: "system" as const,
      createdAt: new Date(),
      content: [
        {
          type: "text" as const,
          text: prompt,
        },
      ],
      metadata: { custom: {} },
    } satisfies ThreadMessageLike,
  ];
};

export async function loadProjects(
  userId: string | null | undefined
): Promise<ProjectConfig[]> {
  if (!userId) return [];

  const rows = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      color: projectsTable.color,
      instructions: projectsTable.instructions,
      isDefault: sql<boolean>`${projectsTable.id} = ${userId}`,
      createdAt: projectsTable.createdAt,
    })
    .from(projectsTable)
    .leftJoin(
      chats,
      and(eq(chats.projectId, projectsTable.id), isNull(chats.deletedAt))
    )
    .where(
      and(eq(projectsTable.userId, userId), isNull(projectsTable.deletedAt))
    )
    .groupBy(
      projectsTable.id,
      projectsTable.name,
      projectsTable.color,
      projectsTable.instructions,
      projectsTable.createdAt
    )
    .orderBy(asc(projectsTable.createdAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    instructions: row.instructions,
    isDefault: row.isDefault,
  }));
}

export async function ensurePreferences(userId: string | null | undefined) {
  if (!userId) return null;

  const row = await db.query.preferences.findFirst({
    where: eq(preferencesTable.userId, userId),
  });

  if (!row) {
    return await db
      .insert(preferencesTable)
      .values({ userId })
      .returning()
      .then((rows) => rows[0]);
  }

  return row;
}

export async function ensureGeneralProject(
  user: User | undefined | null,
  generalProjectName: string
): Promise<void> {
  if (!user) return;
  const userId = user.id;

  const existing = await db.query.projects.findFirst({
    columns: {
      id: true,
    },
    where: and(eq(projectsTable.id, userId), isNull(projectsTable.deletedAt)),
  });

  if (existing) {
    return;
  }

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) {
    console.error("User logged in without email", user);
    return;
  }
  await db
    .insert(userStatsTable)
    .values({
      id: userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email,
      createdAt: new Date(user.createdAt),
      lastSignInAt: new Date(),
      lastActiveAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userStatsTable.id,
      set: {
        lastActiveAt: new Date(),
      },
    });

  await db
    .insert(projectsTable)
    .values({
      id: userId,
      userId,
      name: generalProjectName,
      color: DEFAULT_PROJECT_COLOR,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    })
    .onConflictDoUpdate({
      target: projectsTable.id,
      set: {
        name: generalProjectName,
        deletedAt: null,
      },
    });
}

export async function getRecentNews(
  lastSeenAt: Date | null | undefined,
  locale: string
) {
  const oldest = new Date(Date.now() - NEWS_WINDOW_MS);
  const cutoff = !lastSeenAt || lastSeenAt < oldest ? oldest : lastSeenAt;

  const rows = await db
    .select({
      id: newsArticles.id,
      titleText: sql<string>`title->>${locale}`,
      bodyText: sql<string>`body->>${locale}`,
      createdAt: newsArticles.createdAt,
    })
    .from(newsArticles)
    .where(
      and(
        isNull(newsArticles.deletedAt),
        gt(newsArticles.createdAt, cutoff),
        sql<boolean>`title->>${locale} IS NOT NULL`,
        sql<boolean>`body->>${locale} IS NOT NULL`
      )
    )
    .orderBy(desc(newsArticles.createdAt))
    .catch((error) => {
      console.error("Failed to load recent news:", error);
      throw error instanceof Error ? error : new Error(String(error));
    });

  return rows;
}
