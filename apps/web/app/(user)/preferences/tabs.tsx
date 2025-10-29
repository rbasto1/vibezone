"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

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
  XIcon,
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

  const [hiddenProviders, setHiddenProvidersState] = useState<Set<string>>(
    () => new Set(preferences.hiddenProviders ?? [])
  );
  const [autoScroll, setAutoScrollState] = useState(preferences.autoScroll);
  const [webSearch, setWebSearchState] = useState(preferences.pluginWeb);
  const [enterKeySends, setEnterKeySendsState] = useState(
    preferences.enterKeySends
  );
  const [shiftEnterKeySends, setShiftEnterKeySendsState] = useState(
    preferences.shiftEnterKeySends
  );
  const [reasoningEffort, setReasoningEffortState] =
    useState<ReasoningEffortValue>(
      normalizeReasoningEffort(preferences.reasoningEffort)
    );

  useEffect(() => {
    setAutoScrollState(preferences.autoScroll);
    setWebSearchState(preferences.pluginWeb);
    setEnterKeySendsState(preferences.enterKeySends);
    setShiftEnterKeySendsState(preferences.shiftEnterKeySends);
    setReasoningEffortState(
      normalizeReasoningEffort(preferences.reasoningEffort)
    );
    const initialHidden = new Set(preferences.hiddenProviders ?? []);
    setHiddenProvidersState(initialHidden);
  }, [preferences]);

  const updatePreferences = trpc.users.updatePreferences.useMutation();

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : JSON.stringify(error);

  const handleAutoScrollChange = (value: boolean) => {
    const previous = autoScroll;
    setAutoScrollState(value);
    setPreferences((prev) => ({ ...prev, autoScroll: value }));

    updatePreferences.mutate(
      { autoScroll: value },
      {
        onError: (error: unknown) => {
          console.error("Error saving preferences:", error);
          const message = getErrorMessage(error);
          toast.error(t("toast.error", { message }));
          setAutoScrollState(previous);
          setPreferences((prev) => ({ ...prev, autoScroll: previous }));
        },
      }
    );
  };

  const handleWebSearchChange = (value: boolean) => {
    const previous = webSearch;
    setWebSearchState(value);
    setPreferences((prev) => ({ ...prev, pluginWeb: value }));

    updatePreferences.mutate(
      { webSearch: value },
      {
        onError: (error: unknown) => {
          console.error("Error saving preferences:", error);
          const message = getErrorMessage(error);
          toast.error(t("toast.error", { message }));
          setWebSearchState(previous);
          setPreferences((prev) => ({ ...prev, pluginWeb: previous }));
        },
      }
    );
  };

  const handleEnterKeySendsChange = (value: boolean) => {
    const previous = enterKeySends;
    setEnterKeySendsState(value);
    setPreferences((prev) => ({ ...prev, enterKeySends: value }));

    updatePreferences.mutate(
      { enterKeySends: value },
      {
        onError: (error: unknown) => {
          console.error("Error saving preferences:", error);
          const message = getErrorMessage(error);
          toast.error(t("toast.error", { message }));
          setEnterKeySendsState(previous);
          setPreferences((prev) => ({ ...prev, enterKeySends: previous }));
        },
      }
    );
  };

  const handleShiftEnterKeySendsChange = (value: boolean) => {
    const previous = shiftEnterKeySends;
    setShiftEnterKeySendsState(value);
    setPreferences((prev) => ({ ...prev, shiftEnterKeySends: value }));

    updatePreferences.mutate(
      { shiftEnterKeySends: value },
      {
        onError: (error: unknown) => {
          console.error("Error saving preferences:", error);
          const message = getErrorMessage(error);
          toast.error(t("toast.error", { message }));
          setShiftEnterKeySendsState(previous);
          setPreferences((prev) => ({
            ...prev,
            shiftEnterKeySends: previous,
          }));
        },
      }
    );
  };

  const handleReasoningEffortChange = (value: ReasoningEffortValue) => {
    const previous = reasoningEffort;
    setReasoningEffortState(value);
    setPreferences((prev) => ({ ...prev, reasoningEffort: value }));

    updatePreferences.mutate(
      { reasoningEffort: value },
      {
        onError: (error: unknown) => {
          console.error("Error saving preferences:", error);
          const message = getErrorMessage(error);
          toast.error(t("toast.error", { message }));
          setReasoningEffortState(previous);
          setPreferences((prev) => ({ ...prev, reasoningEffort: previous }));
        },
      }
    );
  };

  const handleHiddenProvidersChange: Dispatch<SetStateAction<Set<string>>> = (
    value
  ) => {
    setHiddenProvidersState((prev) => {
      const previousSet = new Set(prev);
      const nextSet = typeof value === "function" ? value(prev) : value;
      const previousList = Array.from(previousSet).sort();
      const nextList = Array.from(nextSet).sort();

      setPreferences((prevPrefs) => ({
        ...prevPrefs,
        hiddenProviders: nextList,
      }));

      updatePreferences.mutate(
        { hiddenProviders: nextList },
        {
          onError: (error: unknown) => {
            console.error("Error saving preferences:", error);
            const message = getErrorMessage(error);
            toast.error(t("toast.error", { message }));
            setHiddenProvidersState(previousSet);
            setPreferences((prevPrefs) => ({
              ...prevPrefs,
              hiddenProviders: previousList,
            }));
          }
        }
      );

      return nextSet;
    });
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
        <button
          type="button"
          onClick={() => setUIState({ panelOpen: null })}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

        <PreferencesGeneralTab
          autoScroll={autoScroll}
          setAutoScroll={handleAutoScrollChange}
          webSearch={webSearch}
          setWebSearch={handleWebSearchChange}
          enterKeySends={enterKeySends}
          setEnterKeySends={handleEnterKeySendsChange}
          shiftEnterKeySends={shiftEnterKeySends}
          setShiftEnterKeySends={handleShiftEnterKeySendsChange}
          reasoningEffort={reasoningEffort}
          setReasoningEffort={handleReasoningEffortChange}
        />

        <PreferencesProvidersTab
          hiddenProviders={hiddenProviders}
          setHiddenProviders={handleHiddenProvidersChange}
        />

        <PreferencesInstructionsTab />

        <PreferencesDataTab />
      </Tabs>
    </div>
  );
};

export default PreferencesPage;
