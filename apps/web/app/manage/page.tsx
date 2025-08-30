import type { NextPage } from "next";
import "server-only";
import ManagePageClient from "./page-client";

const ManagePage: NextPage<PageProps<"/manage">> = () => {
  return <ManagePageClient />;
};

export default ManagePage;
