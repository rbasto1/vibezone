import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { cn } from "@/components/ui/utils";
import { models as rawModels } from "@/generated/models";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { trpc } from "@/lib/trpc/client";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : JSON.stringify(error);

export const PreferencesProvidersTab = () => {
  const t = useTranslations("UserPreferences");
  const [preferences, setPreferences] = useUserPreferences();
  const updatePreferences = trpc.users.updatePreferences.useMutation();
  const [providerInput, setProviderInput] = useState("");
  const [hiddenProvidersSet, setHiddenProvidersSet] = useState<Set<string>>(
    () => new Set(preferences.hiddenProviders ?? [])
  );

  useEffect(() => {
    setHiddenProvidersSet(new Set(preferences.hiddenProviders ?? []));
  }, [preferences.hiddenProviders]);

  const providerOptions = useMemo(
    () =>
      [...rawModels.providers].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      ),
    []
  );

  const currentHiddenProviders = useMemo(
    () => Array.from(hiddenProvidersSet).sort(),
    [hiddenProvidersSet]
  );

  const trimmedInput = providerInput.trim();
  const matchingProviders = useMemo(() => {
    const query = trimmedInput.toLowerCase();
    const base = query
      ? providerOptions.filter(
          (provider) =>
            provider.name.toLowerCase().includes(query) ||
            provider.id.toLowerCase().includes(query)
        )
      : providerOptions;
    return query ? base.slice(0, 10) : base;
  }, [providerOptions, trimmedInput]);

  const mutateHiddenProviders = (nextSet: Set<string>, previousSet: Set<string>) => {
    const nextList = Array.from(nextSet).sort();
    const previousList = Array.from(previousSet).sort();

    setPreferences((prev) => ({
      ...prev,
      hiddenProviders: nextList,
    }));

    updatePreferences.mutate(
      { hiddenProviders: nextList },
      {
        onError: (error: unknown) => {
          console.error("Error saving preferences:", error);
          const message = getErrorMessage(error);
          toast.error(t("toast.error", { message }));
          setHiddenProvidersSet(new Set(previousList));
          setPreferences((prev) => ({
            ...prev,
            hiddenProviders: previousList,
          }));
        },
      }
    );
  };

  const resetProviders = () => {
    if (!currentHiddenProviders.length) return;
    const previousSet = new Set(hiddenProvidersSet);
    setHiddenProvidersSet(new Set());
    setProviderInput("");
    mutateHiddenProviders(new Set(), previousSet);
  };

  const handleRemoveProvider = (providerId: string) => {
    if (!hiddenProvidersSet.has(providerId)) return;
    const previousSet = new Set(hiddenProvidersSet);
    const nextSet = new Set(hiddenProvidersSet);
    nextSet.delete(providerId);
    if (nextSet.size === 0) {
      setProviderInput("");
    }
    setHiddenProvidersSet(nextSet);
    mutateHiddenProviders(nextSet, previousSet);
  };

  const handleAddProvider = (providerId: string) => {
    if (!providerId || hiddenProvidersSet.has(providerId)) return;
    const exists = providerOptions.find(
      (provider) => provider.id === providerId
    );
    if (!exists) return;

    const previousSet = new Set(hiddenProvidersSet);
    const nextSet = new Set(hiddenProvidersSet);
    nextSet.add(providerId);
    setHiddenProvidersSet(nextSet);
    mutateHiddenProviders(nextSet, previousSet);
  };

  return (
    <TabsContent value="providers" className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div id="hide-providers-label" className="space-y-1">
            <div className="text-sm font-medium">
              {t("hiddenProviders.label")}
            </div>
            <p className="text-muted-foreground text-sm">
              {t("hiddenProviders.description")}
            </p>
          </div>
          <Button
            variant="link"
            onClick={resetProviders}
            disabled={!currentHiddenProviders.length}
            className="px-0 text-sm"
          >
            {t("hiddenProviders.clear")}
          </Button>
        </div>

        <div className="space-y-1">
          <div className="rounded-md border">
            <Input
              className="rounded-t-md rounded-b-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              value={providerInput}
              onChange={(event) => setProviderInput(event.target.value)}
              placeholder={t("hiddenProviders.placeholder")}
            />
            <div className="max-h-106 overflow-y-auto border-t">
              {matchingProviders.length ? (
                <div className="grid divide-y divide-border/60 md:grid-cols-2 md:divide-y-0 md:divide-x lg:grid-cols-4">
                  {matchingProviders.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => {
                        if (hiddenProvidersSet.has(provider.id)) {
                          handleRemoveProvider(provider.id);
                        } else {
                          handleAddProvider(provider.id);
                        }
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium hover:bg-muted/60"
                    >
                      {hiddenProvidersSet.has(provider.id) ? (
                        <EyeOffIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span
                        className={cn(
                          "truncate",
                          hiddenProvidersSet.has(provider.id) && "line-through"
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
            {currentHiddenProviders.length
              ? t("hiddenProviders.summary", {
                  count: currentHiddenProviders.length,
                })
              : t("hiddenProviders.empty")}
          </div>
        </div>
      </section>
    </TabsContent>
  );
};
