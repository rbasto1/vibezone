"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";

import { Sidebar } from "@/components/ui/sidebar/sidebar";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { siteName } from "@/lib/branding";
import { useTranslations } from "next-intl";
import { ThreadList } from "./assistant-ui/thread-list/thread-list";
import { SidebarContent } from "./ui/sidebar/sidebar-content";
import { SidebarHeader } from "./ui/sidebar/sidebar-header";
import { SidebarMenu } from "./ui/sidebar/sidebar-menu";
import { SidebarMenuButton } from "./ui/sidebar/sidebar-menu-button";
import { SidebarMenuItem } from "./ui/sidebar/sidebar-menu-item";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations("Sidebar");
  const setUIState = useUIStateSetter();
  const handleHomeClick = () =>
    setUIState({ panelOpen: null, detailsModelId: undefined });

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link
                href="/"
                aria-label={t("homeAria")}
                onClick={handleHomeClick}
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                  <Image
                    src="/assets/icon-64.png"
                    alt={siteName}
                    width={24}
                    height={24}
                    className="size-6"
                    priority
                  />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">{siteName}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <ThreadList />
      </SidebarContent>

      {/* <SidebarRail />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="#" onClick={(e) => e.preventDefault()}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <HelpCircle className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">{t("help.title")}</span>
                  <span className="">{t("help.subtitle")}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter> */}
    </Sidebar>
  );
}
