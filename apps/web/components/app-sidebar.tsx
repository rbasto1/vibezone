"use client";

import Image from "next/image";
import React from "react";

import { Sidebar } from "@/components/ui/sidebar/sidebar";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { siteName } from "@/lib/branding";
import { useTranslations } from "next-intl";
import { ThreadList } from "./assistant-ui/thread-list/thread-list";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";
import { SidebarContent } from "./ui/sidebar/sidebar-content";
import { SidebarFooter } from "./ui/sidebar/sidebar-footer";
import { SidebarHeader } from "./ui/sidebar/sidebar-header";
import { SidebarMenu } from "./ui/sidebar/sidebar-menu";
import { SidebarMenuItem } from "./ui/sidebar/sidebar-menu-item";
import { SidebarRail } from "./ui/sidebar/sidebar-rail";
import { SidebarTrigger } from "./ui/sidebar/sidebar-trigger";
import { UserMenu } from "./user-menu";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations("Sidebar");
  const setUIState = useUIStateSetter();
  const handleHomeClick = () =>
    setUIState({ panelOpen: null, detailsModelId: undefined });

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground"
                aria-label={t("homeAria")}
                onClick={handleHomeClick}
              >
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
            </div>
            <SidebarTrigger />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <ThreadList />
      </SidebarContent>

      <SidebarRail />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* <Link href="#" onClick={(e) => e.preventDefault()}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <HelpCircleIcon className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">{t("help.title")}</span>
                  <span className="">{t("help.subtitle")}</span>
                </div>
              </Link> */}
            <div className="flex items-center gap-2 justify-center">
              <UserMenu />
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
