"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import Image from "next/image";
import Link from "next/link";
import type { FC, ReactNode } from "react";

interface SiteTopNavProps {
  extraLeft?: ReactNode;
  extraRight?: ReactNode;
}

export const SiteTopNav: FC<SiteTopNavProps> = ({ extraLeft, extraRight }) => {
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

      <div className="ml-auto flex items-center gap-2">
        {extraRight}
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
};
