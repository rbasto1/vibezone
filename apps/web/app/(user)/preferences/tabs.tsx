"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReasoningEffort } from "@/db";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { siteName } from "@/lib/branding";
import { trpc } from "@/lib/trpc/client";
import {
  Building2Icon,
  DatabaseBackupIcon,
  ScrollTextIcon,
  Settings2Icon,
} from "lucide-react";
import { PreferencesDataTab } from "./data";
import type { ReasoningEffortValue } from "./general";
import { PreferencesGeneralTab } from "./general";
import { PreferencesInstructionsTab } from "./instructions";
import { PreferencesProvidersTab } from "./providers";

const normalizeReasoningEffort = (
  effort: ReasoningEffort
): ReasoningEffortValue => (effort === "none" ? "low" : effort);

const PreferencesPage = () => {
  const t = useTranslations("UserPreferences");
  const [preferences, setPreferences] = useUserPreferences();
  const setUIState = useUIStateSetter();

  const [hiddenProviders, setHiddenProviders] = useState<Set<string>>(
    () => new Set(preferences.hiddenProviders ?? [])
  );
  const initialHiddenProviders = preferences.hiddenProviders.sort();
  const initialAutoScroll = preferences.autoScroll;
  const initialWebSearch = preferences.pluginWeb;
  const initialReasoningEffort = normalizeReasoningEffort(
    preferences.reasoningEffort
  );

  const [autoScroll, setAutoScroll] = useState(initialAutoScroll);
  const [webSearch, setWebSearch] = useState(initialWebSearch);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffortValue>(
    initialReasoningEffort
  );

  useEffect(() => {
    setAutoScroll(preferences.autoScroll);
    setWebSearch(preferences.pluginWeb);
    setReasoningEffort(normalizeReasoningEffort(preferences.reasoningEffort));
    const initialHidden = new Set(preferences.hiddenProviders ?? []);
    setHiddenProviders(initialHidden);
  }, [preferences, setUIState]);

  const currentHiddenProviders = Array.from(hiddenProviders).sort();
  const hasHiddenChanged =
    currentHiddenProviders.length !== initialHiddenProviders.length ||
    currentHiddenProviders.some(
      (provider, index) => provider !== initialHiddenProviders[index]
    );

  const hasChanges =
    autoScroll !== initialAutoScroll ||
    webSearch !== initialWebSearch ||
    reasoningEffort !== initialReasoningEffort ||
    hasHiddenChanged;

  const updatePreferences = trpc.users.updatePreferences.useMutation({
    onError: (error: unknown) => {
      console.error("Error saving preferences:", error);
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      toast.error(t("toast.error", { message }));
      setPreferences((prev) => ({
        ...prev,
        pluginWeb: initialWebSearch,
        reasoningEffort: initialReasoningEffort,
        autoScroll: initialAutoScroll,
        hiddenProviders: initialHiddenProviders,
      }));
    },
  });

  const handleSave = () => {
    const targetHidden = Array.from(hiddenProviders).sort();
    const hiddenList = targetHidden;

    setUIState({ panelOpen: null });

    updatePreferences.mutate({
      autoScroll,
      webSearch,
      reasoningEffort,
      hiddenProviders: hiddenList,
    });
    setPreferences((prev) => ({
      ...prev,
      pluginWeb: webSearch,
      reasoningEffort,
      autoScroll,
      hiddenProviders: hiddenList,
    }));
  };

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("description", { siteName })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setUIState({ panelOpen: null })}
          >
            {t("actions.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            {t("actions.save")}
          </Button>
        </div>
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

        <PreferencesGeneralTab
          autoScroll={autoScroll}
          setAutoScroll={setAutoScroll}
          webSearch={webSearch}
          setWebSearch={setWebSearch}
          reasoningEffort={reasoningEffort}
          setReasoningEffort={setReasoningEffort}
        />

        <PreferencesProvidersTab
          hiddenProviders={hiddenProviders}
          setHiddenProviders={setHiddenProviders}
        />

        <PreferencesInstructionsTab />

        <PreferencesDataTab />
      </Tabs>
    </div>
  );
};

export default PreferencesPage;
