import "server-only";

import { getServerCaller, prefetch } from "@/lib/trpc/server/ssr";
import { HydrationBoundary } from "@tanstack/react-query";
import type { NextPage } from "next";
import ProviderManagePageClient from "./page-client";

const ProvidersPage: NextPage<PageProps<"/manage/providers">> = async () => {
  const caller = await getServerCaller();
  const state = await prefetch(caller, [
    caller.providers.list.prefetch({ showDeleted: true }),
  ]);

  return (
    <HydrationBoundary state={state}>
      <ProviderManagePageClient />
    </HydrationBoundary>
  );
};

export default ProvidersPage;
