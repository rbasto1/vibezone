import "server-only";

import { getModelsList } from "@/lib/trpc/models";
import type { NextPage } from "next";
import ManagePageClient from "./page-client";

const ManagePage: NextPage<PageProps<"/manage">> = async () => {
  const initialModels = await getModelsList();
  return <ManagePageClient initialModels={initialModels} />;
};

export default ManagePage;
