"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/components/ui/utils";
import { useRawModelsValue } from "@/hooks/use-models";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { trpc } from "@/lib/trpc/client";

const PreferencesPage = () => {
  const t = useTranslations("UserPreferences");
  const [preferences, setPreferences] = useUserPreferences();
  const setUIState = useUIStateSetter();

  const [hiddenProviders, setHiddenProviders] = useState<Set<string>>(
    () => new Set(preferences.hiddenProviders ?? [])
  );
  const currentHiddenProviders = Array.from(hiddenProviders).sort();
  const initialHiddenProviders = preferences.hiddenProviders.sort();
  const initialAutoScroll = preferences.autoScroll;
  const initialWebSearch = preferences.pluginWeb;
  const initialChangedPrompt = preferences.changedPrompt;
  const initialSystemPrompt = initialChangedPrompt
    ? (preferences.systemPrompt ?? "")
    : "";

  const [autoScroll, setAutoScroll] = useState(initialAutoScroll);
  const [webSearch, setWebSearch] = useState(initialWebSearch);
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);
  const [hideProvidersEnabled, setHideProvidersEnabled] = useState(
    () => !!preferences.hiddenProviders.length
  );
  const [providerInput, setProviderInput] = useState("");

  useEffect(() => {
    setAutoScroll(preferences.autoScroll);
    setWebSearch(preferences.pluginWeb);
    setSystemPrompt(initialSystemPrompt);
    const initialHidden = new Set(preferences.hiddenProviders ?? []);
    setHiddenProviders(initialHidden);
    setHideProvidersEnabled(initialHidden.size > 0);
    setProviderInput("");
  }, [preferences, setUIState, initialSystemPrompt]);

  const { providers: rawProviders } = useRawModelsValue();
  const providerOptions = useMemo(
    () =>
      [...rawProviders].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      ),
    [rawProviders]
  );

  const trimmedInput = providerInput.trim();
  const matchingProviders = useMemo(() => {
    if (!hideProvidersEnabled) return [];
    const query = trimmedInput.toLowerCase();
    const base = query
      ? providerOptions.filter(
          (provider) =>
            provider.name.toLowerCase().includes(query) ||
            provider.id.toLowerCase().includes(query)
        )
      : providerOptions;
    return query ? base.slice(0, 10) : base;
  }, [providerOptions, hideProvidersEnabled, trimmedInput]);

  const hasHiddenChanged =
    currentHiddenProviders.length !== initialHiddenProviders.length ||
    currentHiddenProviders.some(
      (provider, index) => provider !== initialHiddenProviders[index]
    );

  const hasChanges =
    autoScroll !== initialAutoScroll ||
    webSearch !== initialWebSearch ||
    systemPrompt !== initialSystemPrompt ||
    hasHiddenChanged;

  const resetProviders = () => {
    setHiddenProviders(new Set());
    setHideProvidersEnabled(false);
    setProviderInput("");
  };

  const handleRemoveProvider = (providerId: string) => {
    setHiddenProviders((prev) => {
      const next = new Set(prev);
      next.delete(providerId);
      if (next.size === 0) {
        setHideProvidersEnabled(false);
        setProviderInput("");
      }
      return next;
    });
  };

  const handleAddProvider = (providerId: string) => {
    if (!providerId || hiddenProviders.has(providerId)) return;
    const exists = providerOptions.find(
      (provider) => provider.id === providerId
    );
    if (!exists) return;
    setHiddenProviders((prev) => {
      const next = new Set(prev);
      next.add(providerId);
      return next;
    });
    setHideProvidersEnabled(true);
  };

  const updatePreferences = trpc.users.updatePreferences.useMutation({
    onError: (error: unknown) => {
      console.error("Error saving preferences:", error);
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      toast.error(t("toast.error", { message }));
      setPreferences({
        pluginWeb: initialWebSearch,
        systemPrompt: initialSystemPrompt,
        changedPrompt: initialChangedPrompt,
        autoScroll: initialAutoScroll,
        hiddenProviders: initialHiddenProviders,
      });
    },
  });

  const handleSave = () => {
    const targetHidden = hideProvidersEnabled
      ? Array.from(hiddenProviders).sort()
      : ([] as string[]);
    const hiddenList = targetHidden;

    setUIState({ preferencesOpen: false });

    updatePreferences.mutate({
      autoScroll,
      webSearch,
      hiddenProviders: hiddenList,
      systemPrompt,
    });
    setPreferences({
      pluginWeb: webSearch,
      systemPrompt,
      changedPrompt:
        initialChangedPrompt || systemPrompt !== initialSystemPrompt,
      autoScroll,
      hiddenProviders: hiddenList,
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setUIState({ preferencesOpen: false })}
          >
            {t("actions.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            {t("actions.save")}
          </Button>
        </div>
      </header>

      <section className="space-y-6">
        <PreferenceRow
          id="auto-scroll"
          label={t("autoScroll.label")}
          description={t("autoScroll.description")}
          checked={autoScroll}
          onToggle={setAutoScroll}
        />

        <PreferenceRow
          id="web-search"
          label={t("webSearch.label")}
          description={t("webSearch.description")}
          checked={webSearch}
          onToggle={setWebSearch}
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div id="hide-providers-label" className="space-y-1">
            <div className="text-sm font-medium">
              {t("hiddenProviders.label")}
            </div>
            <p className="text-muted-foreground text-sm">
              {t("hiddenProviders.description")}
            </p>
          </div>
          <PreferenceToggle
            id="hide-providers-toggle"
            checked={hideProvidersEnabled}
            onToggle={(enabled) => {
              if (!enabled) {
                resetProviders();
                return;
              }
              setHideProvidersEnabled(true);
            }}
            ariaLabelledBy="hide-providers-label"
          />
        </div>

        {hideProvidersEnabled && (
          <div className="space-y-1">
            <div className="rounded-md border">
              <Input
                className="rounded-t-md rounded-b-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                value={providerInput}
                onChange={(event) => setProviderInput(event.target.value)}
                placeholder={t("hiddenProviders.placeholder")}
              />
              <div className="max-h-56 overflow-y-auto border-t">
                {matchingProviders.length ? (
                  <div className="grid divide-y divide-border/60 md:grid-cols-2 md:divide-y-0 md:divide-x lg:grid-cols-4">
                    {matchingProviders.map((provider) => (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => {
                          if (hiddenProviders.has(provider.id)) {
                            handleRemoveProvider(provider.id);
                          } else {
                            handleAddProvider(provider.id);
                          }
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60 truncate font-medium cursor-pointer"
                      >
                        {hiddenProviders.has(provider.id) ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span
                          className={cn(
                            hiddenProviders.has(provider.id) && "line-through"
                          )}
                        >
                          {provider.name}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="px-3 py-3 text-sm text-muted-foreground">
                    {t("hiddenProviders.noResults", {
                      query: trimmedInput || t("hiddenProviders.any"),
                    })}
                  </p>
                )}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              {t("hiddenProviders.summary", {
                count: currentHiddenProviders.length,
              })}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div>
          <div className="text-sm font-medium">{t("systemPrompt.label")}</div>
          <p className="text-muted-foreground text-sm">
            {t("systemPrompt.description")}
          </p>
        </div>
        <textarea
          className="min-h-[180px] w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          value={systemPrompt}
          onChange={(event) => setSystemPrompt(event.target.value)}
          placeholder={t("systemPrompt.placeholder")}
          maxLength={4000}
        />
      </section>
    </div>
  );
};

interface PreferenceRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onToggle: (value: boolean) => void;
}

const PreferenceRow = ({
  id,
  label,
  description,
  checked,
  onToggle,
}: PreferenceRowProps) => {
  const labelId = `${id}-label`;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="space-y-1" id={labelId}>
        <span className="text-sm font-medium">{label}</span>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <PreferenceToggle
        id={id}
        checked={checked}
        onToggle={onToggle}
        ariaLabelledBy={labelId}
      />
    </div>
  );
};

interface PreferenceToggleProps {
  id: string;
  checked: boolean;
  onToggle: (value: boolean) => void;
  ariaLabelledBy?: string;
}

const PreferenceToggle = ({
  id,
  checked,
  onToggle,
  ariaLabelledBy,
}: PreferenceToggleProps) => {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-labelledby={ariaLabelledBy}
      onClick={() => onToggle(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full border transition",
        checked ? "border-primary bg-primary" : "border-border bg-muted"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 translate-x-1 rounded-full bg-background shadow transition",
          checked ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  );
};

export default PreferencesPage;
