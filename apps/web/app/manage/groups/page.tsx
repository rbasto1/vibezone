import "server-only";

import { listModels } from "@/lib/trpc/models";
import { listSuggestionGroups } from "@/lib/trpc/suggestion-groups";
import type { NextPage } from "next";
import GroupsPageClient from "./page-client";

const GroupsPage: NextPage<PageProps<"/manage/groups">> = async () => {
  const [initialGroups, initialModels] = await Promise.all([
    listSuggestionGroups(),
    listModels(),
  ]);
  return (
    <GroupsPageClient
      initialGroups={initialGroups}
      initialModels={initialModels}
    />
  );
};

export default GroupsPage;
