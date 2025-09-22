import { HydrationBoundary } from "@tanstack/react-query";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { Suspense, type PropsWithChildren } from "react";

import { StoreProvider } from "@/components/providers/store-provider";
import { db } from "@/db";
import type { Model } from "@/db/schema";
import { models, user } from "@/db/schema";
import { MAX_PANELS } from "@/lib/constants";
import { generateThreadId } from "@/lib/id";
import type { PanelConfig } from "@/store/panels";

import { Toaster } from "@/components/providers/toast-provider";
import { models as modelsList } from "@/generated/models";
import { auth } from "@/lib/auth";
import { getServerCaller, prefetch } from "@/lib/trpc/server/ssr";
import { PageLoader } from "./page-loader";

export default async function RootLayout({ children }: PropsWithChildren) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  const userId = user?.id;

  const caller = await getServerCaller();
  const state = await prefetch(caller, [caller.chats.listChats.prefetch()]);

  // Load all the state we will pass to the client side store
  const userModelList = await getUserPreferredModels(userId).then(
    (preferredModels) => preferredModels ?? getDefaultModels()
  );

  const initialPanels = userModelList.map(
    (r, order): PanelConfig => ({
      id: generateThreadId(order),
      provider: r.providerId,
      model: r.id,
    })
  );
  return (
    <Suspense fallback={<PageLoader />}>
      <HydrationBoundary state={state}>
        <StoreProvider
          modelsInitialValue={modelsList}
          panelsInitialValue={initialPanels}
        >
          {children}
        </StoreProvider>
        <Toaster />
      </HydrationBoundary>
    </Suspense>
  );
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
