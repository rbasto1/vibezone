import "server-only";

import { db } from "@/db";
import type { Model } from "@/db/schema";
import { models, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { MAX_PANELS } from "@/lib/constants";
import { randomUUID } from "crypto";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { Assistant, type PanelConfig } from "./assistant";

export default async function Home() {
  // Attempt to load user preferences for last opened models
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;

  const modelList =
    (await getUserPreferredModels(userId)) ?? (await getDefaultModels());

  const initialPanels = modelList.map(
    (r): PanelConfig => ({
      id: randomUUID(),
      provider: r.providerId,
      model: r.id,
    })
  );

  return <Assistant initialPanels={initialPanels} />;
}
async function getUserPreferredModels(userId: string | undefined) {
  if (!userId) return null;

  const pref = await db
    .select({ lastModels: user.lastModels })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  const lastModels = pref[0]?.lastModels ?? [];
  if (!lastModels?.length) return null;

  // Fetch only existing chat models, keep user order and limit to MAX_PANELS
  const candidates = await db
    .select({ id: models.id, providerId: models.providerId })
    .from(models)
    .where(
      and(
        inArray(models.id, lastModels),
        isNull(models.deletedAt),
        eq(models.isChat, true)
      )
    );
  const byId = new Map(candidates.map((m) => [m.id, m]));
  const ordered = lastModels
    .map((id) => byId.get(id))
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .slice(0, MAX_PANELS);
  if (!ordered.length) {
    return null;
  }

  return ordered;
}

let defaultModelsCache: Pick<Model, "id" | "providerId">[] | null = null;
async function getDefaultModels() {
  defaultModelsCache ??= await db
    .select({ id: models.id, providerId: models.providerId })
    .from(models)
    .where(
      and(
        isNotNull(models.priority),
        isNull(models.deletedAt),
        eq(models.isChat, true)
      )
    )
    .orderBy(models.priority)
    .limit(MAX_PANELS);
  return defaultModelsCache;
}
