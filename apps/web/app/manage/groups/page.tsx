import "server-only";

import { getServerCaller, prefetch } from "@/lib/trpc/server/ssr";
import { HydrationBoundary } from "@tanstack/react-query";
import type { NextPage } from "next";
import GroupsPageClient from "./page-client";

const GroupsPage: NextPage<PageProps<"/manage/groups">> = async () => {
  const caller = await getServerCaller();
  const state = await prefetch(caller, [
    caller.suggestionGroups.list.prefetch(),
    caller.models.list.prefetch(),
    caller.locales.list.prefetch(),
  ]);

  return (
    <HydrationBoundary state={state}>
      <GroupsPageClient />
    </HydrationBoundary>
  );
};

export default GroupsPage;
