import { ThemeToggle } from "@/components/theme-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { MAX_PANELS } from "@/app/assistant";

import type { FC } from "react";

interface AssistantHeaderProps {
  onAddPanel: () => void;
  panelCount: number;
}

export const AssistantHeader: FC<AssistantHeaderProps> = ({
  onAddPanel: addPanel,
  panelCount,
}) => {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink
              href="https://www.assistant-ui.com/docs/getting-started"
              target="_blank"
              rel="noopener noreferrer"
            >
              AI Chat
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbPage>Multi Model</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant={panelCount < MAX_PANELS ? "outline" : "default"}
          onClick={addPanel}
          disabled={panelCount >= MAX_PANELS}
          aria-label="Add panel"
          title={
            panelCount < MAX_PANELS
              ? "Add panel"
              : `Maximum ${MAX_PANELS} panels`
          }
        >
          Add panel
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
};
