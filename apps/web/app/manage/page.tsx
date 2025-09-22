import "server-only";

import { getServerCaller, prefetch } from "@/lib/trpc/server/ssr";
import { HydrationBoundary } from "@tanstack/react-query";
import type { NextPage } from "next";
import ManagePageClient from "./page-client";

const ManagePage: NextPage<PageProps<"/manage">> = async () => {
  const caller = await getServerCaller();
  const state = await prefetch(caller, [
    caller.models.list.prefetch({ showDeleted: true }),
  ]);

  return (
    <HydrationBoundary state={state}>
      <ManagePageClient />
    </HydrationBoundary>
  );
};

export default ManagePage;
