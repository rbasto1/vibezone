import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { isUserAdmin } from "@/lib/admin";
import { AdminTopNav } from "./admin-topnav";
import { UnauthorizedModal } from "./unauthorized-modal";

const ManageLayout = async ({ children }: LayoutProps<"/manage">) => {
  const user = await currentUser();
  if (!user) {
    redirect("/");
  }
  if (!isUserAdmin(user)) {
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
