"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type LegalLayoutProps = {
  children: ReactNode;
};

export default function LegalLayout({ children }: LegalLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center border-b px-4">
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
          <span className="font-semibold">Vibezone</span>
        </Link>
      </header>
      <main className="container mx-auto flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
