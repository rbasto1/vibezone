import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AdminTopNav } from "./admin-topnav";
import { UnauthorizedModal } from "./unauthorized-modal";

const ManageLayout = async ({ children }: LayoutProps<"/manage">) => {
  const { isAuthenticated, has } = await auth();
  if (!isAuthenticated) {
    redirect("/");
  }
  if (!has({ permission: "org:admin" })) {
    return <UnauthorizedModal />;
  }

  return (
    <div className="w-full">
      <AdminTopNav />
      {children}
    </div>
  );
};

export default ManageLayout;
