import { AdminTopNav } from "./admin-topnav";

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <AdminTopNav />
      {children}
    </div>
  );
}
