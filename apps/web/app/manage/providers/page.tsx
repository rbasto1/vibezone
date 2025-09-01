import "server-only";

import { getProvidersList } from "@/lib/trpc/providers";
import type { NextPage } from "next";
import ProviderManagePageClient from "./page-client";

const ProvidersPage: NextPage<PageProps<"/manage/providers">> = async () => {
  const initialProviders = await getProvidersList();
  return <ProviderManagePageClient initialProviders={initialProviders} />;
};

export default ProvidersPage;
