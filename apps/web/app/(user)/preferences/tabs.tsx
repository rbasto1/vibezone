"use client";

import { useTranslations } from "next-intl";
import type { FC } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { siteName } from "@/lib/branding";
import {
  Building2Icon,
  DatabaseBackupIcon,
  ScrollTextIcon,
  Settings2Icon,
  XIcon,
} from "lucide-react";
import { PreferencesDataTab } from "./data";
import { PreferencesGeneralTab } from "./general";
import { PreferencesInstructionsTab } from "./instructions";
import { PreferencesProvidersTab } from "./providers";

const PreferencesPage: FC = () => {
  const t = useTranslations("UserPreferences");
  const setUIState = useUIStateSetter();

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("description", { siteName })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUIState({ panelOpen: null })}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition cursor-pointer hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("actions.close")}
        >
          <XIcon className="h-5 w-5" />
        </button>
      </header>

      <Tabs defaultValue="general" className="flex flex-col gap-6">
        <TabsList className="border-b border-border flex w-full gap-6 rounded-none bg-transparent p-0">
          {[
            {
              value: "general",
              label: t("tabs.general"),
              Icon: <Settings2Icon />,
            },
            {
              value: "instructions",
              label: t("tabs.instructions"),
              Icon: <ScrollTextIcon />,
            },
            {
              value: "providers",
              label: t("tabs.providers"),
              Icon: <Building2Icon />,
            },
            {
              value: "my-data",
              label: t("tabs.myData"),
              Icon: <DatabaseBackupIcon />,
            },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-none bg-transparent px-0 pb-2 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent"
            >
              {tab.Icon} {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <PreferencesGeneralTab />
        <PreferencesProvidersTab />
        <PreferencesInstructionsTab />
        <PreferencesDataTab />
      </Tabs>
    </div>
  );
};

export default PreferencesPage;
