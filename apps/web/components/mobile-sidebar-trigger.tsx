"use client";

import { SidebarTrigger } from "./ui/sidebar/sidebar-trigger";

export function MobileSidebarTrigger() {
  return (
    <div className="pointer-events-none fixed left-0 top-1/2 z-50 -translate-y-1/2 lg:hidden">
      <div className="pointer-events-auto -translate-x-1/4 transition-transform duration-200 ease-out hover:translate-x-0 focus-within:translate-x-0">
        <SidebarTrigger
          aria-label="Open sidebar"
          className="size-10 rounded-full border border-border bg-background/80 text-muted-foreground shadow-lg backdrop-blur-md hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>
    </div>
  );
}
