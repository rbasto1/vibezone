"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/components/ui/utils";
import type { ReasoningEffort } from "@/db";
import { models as rawModels } from "@/generated/models";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { trpc } from "@/lib/trpc/client";
import { siteName } from "@/lib/branding";

type ReasoningEffortValue = Exclude<ReasoningEffort, "none">;

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
  const currentHiddenProviders = Array.from(hiddenProviders).sort();
  const initialHiddenProviders = preferences.hiddenProviders.sort();
  const initialAutoScroll = preferences.autoScroll;
  const initialWebSearch = preferences.pluginWeb;
  const initialReasoningEffort = normalizeReasoningEffort(
    preferences.reasoningEffort
  );
  const initialChangedPrompt = preferences.changedPrompt;
  const initialSystemPrompt = initialChangedPrompt
    ? (preferences.systemPrompt ?? "")
    : "";

  const [autoScroll, setAutoScroll] = useState(initialAutoScroll);
  const [webSearch, setWebSearch] = useState(initialWebSearch);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffortValue>(
    initialReasoningEffort
  );
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);
  const [providerInput, setProviderInput] = useState("");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState<{
    message: string;
    progress: number;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importCompleted, setImportCompleted] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportQueued, setExportQueued] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    setAutoScroll(preferences.autoScroll);
    setWebSearch(preferences.pluginWeb);
    setReasoningEffort(normalizeReasoningEffort(preferences.reasoningEffort));
    setSystemPrompt(initialSystemPrompt);
    const initialHidden = new Set(preferences.hiddenProviders ?? []);
    setHiddenProviders(initialHidden);
    setProviderInput("");
  }, [preferences, setUIState, initialSystemPrompt]);

  const providerOptions = useMemo(
    () =>
      [...rawModels.providers].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      ),
    []
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

  const hasHiddenChanged =
    currentHiddenProviders.length !== initialHiddenProviders.length ||
    currentHiddenProviders.some(
      (provider, index) => provider !== initialHiddenProviders[index]
    );

  const hasChanges =
    autoScroll !== initialAutoScroll ||
    webSearch !== initialWebSearch ||
    reasoningEffort !== initialReasoningEffort ||
    systemPrompt !== initialSystemPrompt ||
    hasHiddenChanged;

  const resetProviders = () => {
    setHiddenProviders(new Set());
    setProviderInput("");
  };

  const handleImportDialogChange = (open: boolean) => {
    if (!open && isImporting) {
      return;
    }
    setIsImportDialogOpen(open);
    if (!open) {
      setImportFile(null);
      setImportProgress(null);
      setImportCompleted(false);
      setImportError(null);
      setIsImporting(false);
    }
  };

  const handleExportDialogChange = (open: boolean) => {
    if (!open && isExporting) {
      return;
    }
    setIsExportDialogOpen(open);
    if (open) {
      setExportQueued(false);
      setExportError(null);
    } else {
      setExportError(null);
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile || isImporting) return;

    setIsImporting(true);
    setImportError(null);
    setImportProgress(null);
    setImportCompleted(false);

    const formData = new FormData();
    formData.append("file", importFile);

    let completed = false;
    let encounteredError = false;

    const applyPayload = (payload: {
      type?: string;
      progress?: number;
      message?: string;
    }) => {
      if (!payload || typeof payload !== "object") return;
      const { type, progress, message } = payload;
      if (type === "progress") {
        if (!message) return;
        setImportProgress({
          message,
          progress: progress ?? 0,
        });
        return;
      }

      if (type === "complete") {
        completed = true;
        setImportCompleted(true);
        if (message) {
          setImportProgress({
            message,
            progress: progress ?? 100,
          });
        }
        toast.success(t("myData.import.success"));
        setImportFile(null);
        return;
      }

      if (type === "error") {
        const errorMessage =
          message ?? "Unexpected error while importing archive.";
        encounteredError = true;
        setImportError(errorMessage);
        setImportProgress(null);
        toast.error(t("myData.import.error", { message: errorMessage }));
      }
    };

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }

      const body = response.body;
      if (!body) {
        completed = true;
        setImportCompleted(true);
        toast.success(t("myData.import.success"));
        setImportFile(null);
        return;
      }

      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const payload = JSON.parse(line);
            applyPayload(payload);
          } catch (error) {
            console.error("[data-import] Failed to parse progress chunk:", {
              error,
              line,
            });
          }
        }
      }

      if (buffer.trim()) {
        try {
          applyPayload(JSON.parse(buffer));
        } catch (error) {
          console.error("[data-import] Failed to parse trailing chunk:", {
            error,
            buffer,
          });
        }
      }

      if (!completed && !encounteredError) {
        setImportCompleted(true);
        toast.success(t("myData.import.success"));
        setImportFile(null);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected import error.";
      setImportError(message);
      setImportProgress(null);
      toast.error(t("myData.import.error", { message }));
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportRequest = async () => {
    if (isExporting || exportQueued) return;
    setIsExporting(true);
    setExportError(null);
    let shouldCloseDialog = false;
    try {
      const response = await fetch("/api/export", {
        method: "POST",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }
      await response.json();
      setExportQueued(true);
      toast.success(t("myData.export.success"));
      shouldCloseDialog = true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected export error.";
      setExportError(message);
      toast.error(t("myData.export.error", { message }));
    } finally {
      setIsExporting(false);
      if (shouldCloseDialog) {
        setIsExportDialogOpen(false);
      }
    }
  };
  const handleRemoveProvider = (providerId: string) => {
    setHiddenProviders((prev) => {
      const next = new Set(prev);
      next.delete(providerId);
      if (next.size === 0) {
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
  };

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
        systemPrompt: initialSystemPrompt,
        changedPrompt: initialChangedPrompt,
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
      systemPrompt,
    });
    setPreferences((prev) => ({
      ...prev,
      pluginWeb: webSearch,
      reasoningEffort,
      systemPrompt,
      changedPrompt:
        initialChangedPrompt || systemPrompt !== initialSystemPrompt,
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
            { value: "general", label: t("tabs.general") },
            { value: "instructions", label: t("tabs.instructions") },
            { value: "providers", label: t("tabs.providers") },
            { value: "my-data", label: t("tabs.myData") },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-none bg-transparent px-0 pb-2 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general" className="space-y-6">
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

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="space-y-1">
                <span className="text-sm font-medium">
                  {t("reasoningEffort.label")}
                </span>
                <p className="text-muted-foreground text-sm">
                  {t("reasoningEffort.description")}
                </p>
              </div>
              <Select
                value={reasoningEffort}
                onValueChange={(value) =>
                  setReasoningEffort(value as ReasoningEffortValue)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    {t("reasoningEffort.low")}
                  </SelectItem>
                  <SelectItem value="medium">
                    {t("reasoningEffort.medium")}
                  </SelectItem>
                  <SelectItem value="high">
                    {t("reasoningEffort.high")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="instructions" className="space-y-6">
          <section className="space-y-2">
            <div>
              <div className="text-sm font-medium">
                {t("systemPrompt.label")}
              </div>
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
        </TabsContent>

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
                          className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium hover:bg-muted/60"
                        >
                          {hiddenProviders.has(provider.id) ? (
                            <EyeOffIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span
                            className={cn(
                              "truncate",
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
                {currentHiddenProviders.length
                  ? t("hiddenProviders.summary", {
                      count: currentHiddenProviders.length,
                    })
                  : t("hiddenProviders.empty")}
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="my-data" className="space-y-6">
          <section className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {t("myData.description", { siteName })}
            </p>
            {exportQueued && (
              <p className="text-sm text-muted-foreground">
                {t("myData.export.success")}
              </p>
            )}
            {exportError && (
              <p className="text-sm text-destructive">{exportError}</p>
            )}
            {importError && (
              <p className="text-sm text-destructive">{importError}</p>
            )}
            {importCompleted && (
              <p className="text-sm text-muted-foreground">
                {t("myData.import.success")}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => setIsImportDialogOpen(true)}>
                {t("myData.import.button")}
              </Button>
              <Button variant="outline" onClick={() => setIsExportDialogOpen(true)}>
                {t("myData.export.button")}
              </Button>
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <Dialog open={isImportDialogOpen} onOpenChange={handleImportDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("myData.import.title")}</DialogTitle>
            <DialogDescription>
              {t("myData.import.instructions", { siteName })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label
              htmlFor="preferences-import-file"
              className="text-sm font-medium text-foreground"
            >
              {t("myData.import.selectFile")}
            </label>
            <Input
              id="preferences-import-file"
              type="file"
              accept=".zip"
              onChange={(event) =>
                setImportFile(event.target.files?.item(0) ?? null)
              }
            />
            {importFile && (
              <p className="text-xs text-muted-foreground">{importFile.name}</p>
            )}
            {importProgress && (
              <div className="space-y-1 pt-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{
                      width: `${Math.min(
                        Math.max(Number(importProgress.progress) || 0, 0),
                        100
                      )}%`,
                      maxWidth: "100%",
                      minWidth: "0%",
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 text-xs font-medium text-foreground">
                  <span className="max-w-[80%] overflow-hidden break-all">
                    {importProgress.message}
                  </span>
                  <span className="shrink-0">
                    {Math.round(Math.min(Math.max(importProgress.progress, 0), 100))}%
                  </span>
                </div>
              </div>
            )}
            {importError && (
              <p className="text-xs text-destructive">{importError}</p>
            )}
          </div>
          <DialogFooter>
            {importCompleted ? (
              <Button onClick={() => handleImportDialogChange(false)}>
                {t("myData.import.done")}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleImportDialogChange(false)}
                  disabled={isImporting}
                >
                  {t("actions.cancel")}
                </Button>
                <Button
                  onClick={handleImportSubmit}
                  disabled={!importFile || isImporting}
                >
                  {isImporting
                    ? t("myData.import.inProgress")
                    : t("myData.import.submit")}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isExportDialogOpen} onOpenChange={handleExportDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("myData.export.title")}</DialogTitle>
            <DialogDescription>
              {t("myData.export.instructions", { siteName })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {exportQueued && (
              <p className="text-sm text-muted-foreground">
                {t("myData.export.success")}
              </p>
            )}
            {exportError && (
              <p className="text-sm text-destructive">{exportError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleExportDialogChange(false)}
              disabled={isExporting}
            >
              {t("myData.export.cancel")}
            </Button>
            <Button
              onClick={handleExportRequest}
              disabled={isExporting || exportQueued}
            >
              {isExporting
                ? t("myData.export.inProgress")
                : t("myData.export.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
