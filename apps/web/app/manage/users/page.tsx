import "server-only";

import { getServerCaller, prefetch } from "@/lib/trpc/server/ssr";
import { HydrationBoundary } from "@tanstack/react-query";
import type { NextPage } from "next";
import ManageUsersPageClient from "./page-client";

const ManageUsersPage: NextPage<PageProps<"/manage/users">> = async () => {
  const caller = await getServerCaller();
  const state = await prefetch(caller, [caller.users.manageList.prefetch()]);

  return (
    <HydrationBoundary state={state}>
      <ManageUsersPageClient />
    </HydrationBoundary>
  );
};

export default ManageUsersPage;
