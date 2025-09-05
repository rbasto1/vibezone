"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/components/ui/utils";
import { UserMenu } from "@/components/user-menu";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FC, ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
}

interface AdminTopNavProps {
  extraLeft?: ReactNode;
  extraRight?: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/manage", label: "Models" },
  { href: "/manage/providers", label: "Providers" },
];

export const AdminTopNav: FC<AdminTopNavProps> = ({
  extraLeft,
  extraRight,
}) => {
  const pathname = usePathname() || "/";

  // Choose the most specific matching href to avoid multiple actives
  const activeHref = NAV_ITEMS.reduce<string>((acc, item) => {
    if (item.href === "/") return acc || (pathname === "/" ? "/" : acc);
    if (pathname === item.href || pathname.startsWith(item.href + "/")) {
      if (!acc || item.href.length > acc.length) return item.href;
    }
    return acc;
  }, "");

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
      {extraLeft}
      <Link
        href="/"
        className="flex items-center gap-2"
        aria-label="Vibezone Home"
      >
        <Image
          src="/assets/icon-64.png"
          alt="Vibezone Logo"
          width={24}
          height={24}
          className="size-6"
          priority
        />
        <span className="font-semibold hidden sm:inline">Vibezone</span>
      </Link>

      <nav className="ml-2 flex items-center gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              (item.href === "/" ? pathname === "/" : activeHref === item.href)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent"
            )}
            aria-current={
              item.href === "/"
                ? pathname === "/"
                  ? "page"
                  : undefined
                : activeHref === item.href
                  ? "page"
                  : undefined
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {extraRight}
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
};
