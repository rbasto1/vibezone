import { SiteTopNav } from "@/components/site-topnav";

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <SiteTopNav />
      {children}
    </div>
  );
}
