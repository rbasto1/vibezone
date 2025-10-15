import "server-only";

import { HydrationBoundary } from "@tanstack/react-query";
import type { NextPage } from "next";

import { getServerCaller, prefetch } from "@/lib/trpc/server/ssr";
import NewsManagePageClient from "./page-client";

const NewsPage: NextPage<PageProps<"/manage/news">> = async () => {
  const caller = await getServerCaller();
  const state = await prefetch(caller, [
    caller.news.list.prefetch({ includeDeleted: true }),
  ]);

  return (
    <HydrationBoundary state={state}>
      <NewsManagePageClient />
    </HydrationBoundary>
  );
};

export default NewsPage;
