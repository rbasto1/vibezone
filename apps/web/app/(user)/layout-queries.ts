import "server-only";

import { generateId } from "ai";
import { and, asc, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";

import type { Model } from "@/db";
import {
  db,
  instructions as instructionsTable,
  memories as memoriesTable,
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
import type { MemoryConfig } from "@/store/memories";
import type { ProjectConfig } from "@/store/projects";
import type { ThreadMessageLike } from "@assistant-ui/react";
import type { User } from "@clerk/nextjs/server";
import type {
  Preferences,
  Project,
  SystemMessageInstruction,
  SystemMessageMemory,
} from "@vibezone/database";

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
  instructions?: SystemMessageInstruction[],
  memories?: SystemMessageMemory[]
): ThreadMessageLike[] => {
  if (!prompt) return [];
  const customMetadata = {
    ...(instructions?.length ? { instructions } : {}),
    ...(memories?.length ? { memories } : {}),
  };
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
        custom: Object.keys(customMetadata).length ? customMetadata : {},
      },
    } satisfies ThreadMessageLike,
  ];
};

export interface UserWorkspaceState {
  projects: ProjectConfig[];
  instructions: InstructionConfig[];
  memories: MemoryConfig[];
  preferences: Preferences | null;
}

export async function loadUserWorkspaceState(
  user: User | undefined | null,
  generalProjectName: string
): Promise<UserWorkspaceState> {
  if (!user) {
    return { projects: [], instructions: [], memories: [], preferences: null };
  }

  await ensureUserStats(user);
  const userId = user.id;

  const userRecord = await db.query.userStats
    .findFirst({
      columns: {
        id: true,
      },
      where: eq(userStatsTable.id, userId),
      with: {
        projects: {
          columns: {
            id: true,
            name: true,
            color: true,
            automaticMemoriesDisabled: true,
          },
          where: and(
            eq(projectsTable.userId, userId),
            isNull(projectsTable.deletedAt)
          ),
          orderBy: [asc(projectsTable.createdAt)],
        },
        instructions: {
          columns: {
            id: true,
            title: true,
            content: true,
            projectId: true,
            isActive: true,
            order: true,
          },
          where: and(
            eq(instructionsTable.userId, userId),
            isNull(instructionsTable.deletedAt)
          ),
          orderBy: [
            asc(instructionsTable.order),
            asc(instructionsTable.createdAt),
          ],
        },
        memories: {
          columns: {
            id: true,
            title: true,
            content: true,
            projectId: true,
            isActive: true,
            createdAt: true,
          },
          where: and(
            eq(memoriesTable.userId, userId),
            isNull(memoriesTable.deletedAt)
          ),
          orderBy: [desc(memoriesTable.createdAt)],
        },
        preferences: {
          columns: {
            userId: true,
            lastModels: true,
            lastProjectId: true,
            favoriteModels: true,
            preferenceAutoScroll: true,
            preferenceHiddenProviders: true,
            preferenceWebSearch: true,
            preferenceReasoningEffort: true,
            preferenceEnterKeySends: true,
            preferenceShiftEnterKeySends: true,
            preferenceSkipCloseThreadConfirmation: true,
            preferenceHideLegal: true,
            preferenceAutomaticMemoriesDisabled: true,
            lastNewsSeenAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })
    .catch((error) => {
      console.error("Failed to load user workspace state:", error);
      throw error instanceof Error ? error : new Error(JSON.stringify(error));
    });

  if (!userRecord) {
    return { projects: [], instructions: [], memories: [], preferences: null };
  }

  const projects = userRecord.projects.map(
    (project): ProjectConfig => ({
      id: project.id,
      name: project.name,
      color: project.color,
      isDefault: project.id === userId,
      automaticMemoriesDisabled: project.automaticMemoriesDisabled ?? false,
    })
  );

  if (!projects.length) {
    const defaultProject = await ensureGeneralProject(user, generalProjectName);
    if (defaultProject) {
      projects.push({
        id: defaultProject.id,
        name: defaultProject.name,
        color: defaultProject.color,
        isDefault: true,
        automaticMemoriesDisabled:
          defaultProject.automaticMemoriesDisabled ?? false,
      });
    }
  }

  const instructions = userRecord.instructions.map(
    (instruction): InstructionConfig => ({
      id: instruction.id,
      title: instruction.title,
      content: instruction.content,
      projectId: instruction.projectId,
      isActive: instruction.isActive,
      order: instruction.order,
    })
  );
  const memories = userRecord.memories.map(
    (memory): MemoryConfig => ({
      id: memory.id,
      title: memory.title,
      content: memory.content,
      projectId: memory.projectId,
      isActive: memory.isActive,
      createdAt: memory.createdAt,
    })
  );

  const preferences =
    userRecord.preferences ?? (await ensurePreferences(userId));

  return {
    projects,
    instructions,
    memories,
    preferences,
  };
}

async function ensureUserStats(user: User | undefined | null) {
  if (!user) return;

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) {
    console.error("User logged in without email", user);
    return;
  }

  const now = new Date();
  await db
    .insert(userStatsTable)
    .values({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email,
      createdAt: new Date(user.createdAt),
      lastSignInAt: now,
      lastActiveAt: now,
    })
    .onConflictDoUpdate({
      target: userStatsTable.id,
      set: {
        lastActiveAt: now,
      },
    });
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
): Promise<Project | null> {
  if (!user) return null;
  const userId = user.id;

  const existing = await db.query.projects.findFirst({
    columns: {
      id: true,
    },
    where: and(eq(projectsTable.id, userId), isNull(projectsTable.deletedAt)),
  });

  if (existing) {
    return null;
  }

  const defaultProject = await db
    .insert(projectsTable)
    .values({
      id: userId,
      userId,
      name: generalProjectName,
      color: DEFAULT_PROJECT_COLOR,
    })
    .onConflictDoUpdate({
      target: projectsTable.id,
      set: {
        name: generalProjectName,
        deletedAt: null,
      },
    })
    .returning()
    .then((rows) => rows[0] ?? null);

  return defaultProject;
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
