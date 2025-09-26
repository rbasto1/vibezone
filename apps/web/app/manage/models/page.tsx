import "server-only";

import { getServerCaller, prefetch } from "@/lib/trpc/server/ssr";
import { HydrationBoundary } from "@tanstack/react-query";
import type { NextPage } from "next";
import ModelsPageClient from "./page-client";

const ModelsPage: NextPage<PageProps<"/manage/models">> = async () => {
  const caller = await getServerCaller();
  const state = await prefetch(caller, [
    caller.models.list.prefetch({ showDeleted: true }),
  ]);

  return (
    <HydrationBoundary state={state}>
      <ModelsPageClient />
    </HydrationBoundary>
  );
};

export default ModelsPage;
