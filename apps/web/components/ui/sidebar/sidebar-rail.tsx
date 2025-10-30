"use client";

import { GripIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/components/ui/utils";
import { useSidebar } from "./sidebar-context";

export const SidebarRail = ({
  className,
  ...props
}: ComponentProps<"button">) => {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      type="button"
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onMouseDown={toggleSidebar}
      title="Toggle Sidebar"
      className={cn("sidebar-rail", className)}
      {...props}
    >
      <GripIcon aria-hidden="true" className="sidebar-rail__icon" />
    </button>
  );
};
