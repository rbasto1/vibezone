import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminTopNav } from "./admin-topnav";
import { UnauthorizedModal } from "./unauthorized-modal";

const ManageLayout = async ({ children }: LayoutProps<"/manage">) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/");
  }
  if (!session.user.isAdmin) {
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
