import "server-only";

import { getServerCaller, prefetch } from "@/lib/trpc/server/ssr";
import { HydrationBoundary } from "@tanstack/react-query";
import type { NextPage } from "next";
import LocalesManagePageClient from "./page-client";

const LocalesPage: NextPage = async () => {
  const caller = await getServerCaller();
  const state = await prefetch(caller, [caller.locales.list.prefetch()]);

  return (
    <HydrationBoundary state={state}>
      <LocalesManagePageClient />
    </HydrationBoundary>
  );
};

export default LocalesPage;
