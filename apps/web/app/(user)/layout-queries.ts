import "server-only";

import { generateId } from "ai";
import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";

import type { Model } from "@/db";
import {
  chats as chatsTable,
  db,
  instructions as instructionsTable,
  models as modelsTable,
  newsArticles as newsArticlesTable,
  preferences as preferencesTable,
  projects as projectsTable,
  userStats as userStatsTable,
} from "@/db";
import { models as modelsList } from "@/generated/models";
import {
  DEFAULT_PROJECT_COLOR,
  MAX_PANELS,
  NEWS_WINDOW_MS,
} from "@/lib/constants";
import type { InstructionConfig } from "@/store/instructions";
import type { ProjectConfig } from "@/store/projects";
import type { ThreadMessageLike } from "@assistant-ui/react";
import type { SystemMessageInstruction } from "@vibezone/database";
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
    .select({ id: modelsTable.id, providerId: modelsTable.providerId })
    .from(modelsTable)
    .where(
      and(
        inArray(modelsTable.id, lastModels),
        isNull(modelsTable.deletedAt),
        isNull(modelsTable.hiddenAt),
        eq(modelsTable.isChat, true)
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
  prompt: string | null | undefined,
  instructions?: SystemMessageInstruction[]
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
      metadata: {
        custom: instructions?.length ? { instructions } : {},
      },
    } satisfies ThreadMessageLike,
  ];
};

export async function loadProjects(
  userId: string | null | undefined
): Promise<ProjectConfig[]> {
  if (!userId) return [];

  return await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      color: projectsTable.color,
      isDefault: sql<boolean>`${projectsTable.id} = ${userId}`,
    })
    .from(projectsTable)
    .leftJoin(
      chatsTable,
      and(
        eq(chatsTable.projectId, projectsTable.id),
        isNull(chatsTable.deletedAt)
      )
    )
    .where(
      and(eq(projectsTable.userId, userId), isNull(projectsTable.deletedAt))
    )
    .groupBy(
      projectsTable.id,
      projectsTable.name,
      projectsTable.color,
      projectsTable.createdAt
    )
    .orderBy(projectsTable.createdAt);
}

export async function loadInstructions(
  userId: string | null | undefined
): Promise<InstructionConfig[]> {
  if (!userId) return [];

  return await db
    .select({
      id: instructionsTable.id,
      title: instructionsTable.title,
      content: instructionsTable.content,
      projectId: instructionsTable.projectId,
      isActive: instructionsTable.isActive,
      order: instructionsTable.order,
    })
    .from(instructionsTable)
    .where(
      and(
        eq(instructionsTable.userId, userId),
        isNull(instructionsTable.deletedAt)
      )
    )
    .orderBy(instructionsTable.order, instructionsTable.createdAt);
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

  return await db
    .select({
      id: newsArticlesTable.id,
      titleText: sql<string>`title->>${locale}`,
      bodyText: sql<string>`body->>${locale}`,
      createdAt: newsArticlesTable.createdAt,
    })
    .from(newsArticlesTable)
    .where(
      and(
        isNull(newsArticlesTable.deletedAt),
        gt(newsArticlesTable.createdAt, cutoff),
        sql<boolean>`title->>${locale} IS NOT NULL`,
        sql<boolean>`body->>${locale} IS NOT NULL`
      )
    )
    .orderBy(desc(newsArticlesTable.createdAt))
    .catch((error) => {
      console.error("Failed to load recent news:", error);
      throw error instanceof Error ? error : new Error(String(error));
    });
}
