"use client";

import { BadgeCheck, Crown, Hash, ThumbsUp, XSquareIcon } from "lucide-react";
import type { NextPage } from "next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { QueryAlert } from "@/components/ui/query-alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/ui/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc/client";
import type { ModelsAdminListOutput } from "@/lib/trpc/server/server";
import type { ColumnDef } from "@tanstack/react-table";
import {
  getStorageItem,
  setStorageItem,
  storageKeys,
} from "../session-storage";

const stableEmpty: never[] = [];

const SortingSchema = z
  .array(
    z.object({
      id: z.string(),
      desc: z.boolean(),
    })
  )
  .optional();

// we can't import this from the db because the file is server-only
const providerTiers = ["leaders", "challengers", "specialists"] as const;

const ModelsPageClient: NextPage = () => {
  const {
    data,
    error: listError,
    isLoading,
  } = trpc.models.adminList.useQuery();
  const utils = trpc.useUtils();
  const updateMutation = trpc.models.update.useMutation();
  const deleteMutation = trpc.models.delete.useMutation({
    onSuccess: async () => {
      await utils.models.adminList.invalidate().catch(() => {
        toast.warning("Failed to invalidate models list");
      });
      toast.success("Model deleted successfully");
    },
  });
  const syncMutation = trpc.models.syncFromOpenRouter.useMutation({
    onSuccess: async (res) => {
      await utils.models.adminList.invalidate().catch(() => {
        toast.warning("Failed to invalidate models list");
      });
      toast.success(
        `Sync complete: providers ${res.providersUpserted}, models ${res.modelsUpserted}, soft-deleted ${res.softDeleted}.`
      );
    },
  });

  const [providerFilter, setProviderFilter] = useState(
    getStorageItem(storageKeys.manageProvider) ?? "all"
  );
  const [textFilter, setTextFilter] = useState(
    getStorageItem(storageKeys.manageQuery) ?? ""
  );
  const [sorting, setSorting] = useState(
    () => getStorageItem(storageKeys.manageSort, SortingSchema) ?? []
  );
  const [priorityOnly, setPriorityOnly] = useState(
    () => getStorageItem(storageKeys.managePriority, z.boolean()) ?? false
  );
  const [deletedOnly, setDeletedOnly] = useState(
    () => getStorageItem(storageKeys.manageDeleted, z.boolean()) ?? false
  );
  const [tierFilter, setTierFilter] = useState(
    getStorageItem(storageKeys.manageTier) ?? "all"
  );

  const models = data?.models ?? stableEmpty;
  const providers = data?.providers ?? stableEmpty;

  // Create ordered list of providers for keyboard navigation
  const orderedProviders = useMemo(() => {
    const allProviders = ["all", ...providers.map((p) => p.id)];
    return allProviders;
  }, [providers]);

  // Keyboard navigation for provider filter
  const navigateProvider = useCallback(
    (direction: "up" | "down") => {
      const currentIndex = orderedProviders.indexOf(providerFilter);
      if (currentIndex === -1) return;

      const nextIndex = MathMinMax(
        direction === "down" ? currentIndex + 1 : currentIndex - 1,
        0,
        orderedProviders.length - 1
      );

      const nextProvider = orderedProviders[nextIndex];
      if (nextProvider) {
        setProviderFilter(nextProvider);
        setStorageItem(storageKeys.manageProvider, nextProvider);
      }
    },
    [providerFilter, orderedProviders]
  );

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle arrow keys when no input/select is focused
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "SELECT" ||
        activeElement?.tagName === "TEXTAREA" ||
        (activeElement as HTMLElement)?.contentEditable === "true";

      if (isInputFocused) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        navigateProvider("down");
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        navigateProvider("up");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigateProvider]);

  const columns: ColumnDef<ModelsAdminListOutput["models"][number]>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div
            className={cn(
              "flex flex-col",
              row.original.deletedAt ? "line-through" : ""
            )}
          >
            {row.original.name}
            <span className="text-xs text-muted-foreground">
              {row.original.id}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        accessorKey: "pricing.prompt",
        header: "Prompt",
        cell: ({ row }) => (
          <div className="text-right">
            {row.original.pricing.prompt === 0
              ? "—"
              : formatCurrency(row.original.pricing.prompt * 1_000_000)}
          </div>
        ),
      },
      {
        accessorKey: "pricing.completion",
        header: "Completion",
        cell: ({ row }) => (
          <div className="text-right">
            {row.original.pricing.completion === 0
              ? "—"
              : formatCurrency(row.original.pricing.completion * 1_000_000)}
          </div>
        ),
      },
      {
        id: "edit",
        header: "Edit",
        cell: ({ row }) => {
          const m = row.original;
          const setCacheFields = (patch: Partial<typeof m>) => {
            utils.models.adminList.setData(undefined, (prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                models: prev.models.map((x) =>
                  x.id === m.id ? { ...x, ...patch } : x
                ),
              };
            });
          };

          const onPriorityChange = (val: string) => {
            const trimmed = val.trim();
            const next = trimmed === "" ? null : Number.parseInt(trimmed, 10);
            if (next !== null && Number.isNaN(next)) return; // ignore invalid
            const prev = m.priority ?? null;
            setCacheFields({ priority: next ?? null });
            updateMutation
              .mutateAsync({ id: m.id, priority: next ?? null })
              .catch((e) => {
                setCacheFields({ priority: prev });
                const message = e instanceof Error ? e.message : String(e);
                toast.error(`Failed to update priority: ${message}`);
              });
          };

          const onToggle = (
            key: "isSuggested" | "isPremium" | "isIncluded",
            v: boolean
          ) => {
            const prev = m[key] as boolean | undefined;
            setCacheFields({ [key]: v } as Partial<typeof m>);
            updateMutation.mutateAsync({ id: m.id, [key]: v }).catch((e) => {
              setCacheFields({ [key]: prev } as Partial<typeof m>);
              const message = e instanceof Error ? e.message : String(e);
              toast.error(`Failed to update ${key}: ${message}`);
            });
          };

          return (
            <div
              className="flex items-center gap-3 text-sm"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <input
                type="number"
                placeholder="Priority"
                className="w-16 h-8 rounded border bg-background px-2"
                value={m.priority ?? ""}
                onChange={(e) => onPriorityChange(e.target.value)}
                disabled={!!m.deletedAt}
              />

              <Button
                type="button"
                variant={m.isSuggested ? "default" : "outline"}
                className="transition-colors"
                aria-pressed={!!m.isSuggested}
                title="Suggested"
                onClick={() => onToggle("isSuggested", !m.isSuggested)}
                disabled={!!m.deletedAt}
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                className={cn(
                  "transition-colors",
                  m.isPremium
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                    : "border-transparent text-muted-foreground hover:bg-accent"
                )}
                aria-pressed={!!m.isPremium}
                title="Premium"
                onClick={() => onToggle("isPremium", !m.isPremium)}
                disabled={!!m.deletedAt}
              >
                <Crown className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                className={cn(
                  "transition-colors",
                  m.isIncluded
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                    : "border-transparent text-muted-foreground hover:bg-accent"
                )}
                aria-pressed={!!m.isIncluded}
                title="Included"
                onClick={() => onToggle("isIncluded", !m.isIncluded)}
                disabled={!!m.deletedAt}
              >
                <BadgeCheck className="h-4 w-4" />
              </Button>

              {/* Separator */}
              <div className="h-6 w-px bg-border/60" />

              {/* Delete button */}
              <DeleteIconButton
                isDeleted={!!m.deletedAt}
                onDelete={() => {
                  if (m.deletedAt) {
                    const previousDeletedAt = m.deletedAt;
                    setCacheFields({ deletedAt: null });
                    updateMutation
                      .mutateAsync({ id: m.id, deletedAt: null })
                      .then(() => {
                        toast.success(`Model "${m.name}" restored`);
                      })
                      .catch((err) => {
                        setCacheFields({ deletedAt: previousDeletedAt });
                        const message =
                          err instanceof Error ? err.message : String(err);
                        toast.error(`Failed to restore model: ${message}`);
                      });
                    return;
                  }
                  deleteMutation.mutateAsync({ id: m.id }).catch((e) => {
                    const message = e instanceof Error ? e.message : String(e);
                    toast.error(`Failed to delete model: ${message}`);
                  });
                }}
              />
            </div>
          );
        },
      },
    ],
    [utils.models.adminList, updateMutation, deleteMutation]
  );

  const providerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of models)
      counts[m.providerId] = (counts[m.providerId] || 0) + 1;
    return counts;
  }, [models]);
  const filtered = useMemo(() => {
    const byProvider =
      providerFilter === "all"
        ? models
        : models.filter((m) => m.providerId === providerFilter);
    const q = textFilter.trim().toLowerCase();
    const byQuery = !q
      ? byProvider
      : byProvider.filter((m) => {
          if (m.id.toLowerCase().includes(q)) return true;
          if ((m.name || "").toLowerCase().includes(q)) return true;
          if (m.providerId.toLowerCase().includes(q)) return true;
          return false;
        });
    return byQuery.filter((m) => {
      if (priorityOnly && (m.priority === null || m.priority === undefined))
        return false;
      if (deletedOnly === !m.deletedAt) return false;
      if (tierFilter !== "all") {
        const provider = providers?.find((p) => p.id === m.providerId);
        return provider?.tier === tierFilter;
      }
      return true;
    });
  }, [
    providerFilter,
    models,
    textFilter,
    priorityOnly,
    deletedOnly,
    tierFilter,
    providers,
  ]);

  return (
    <div>
      <div className="mx-auto max-w-[1200px] p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Model Management</h1>
          <Button
            onClick={() => syncMutation.mutateAsync()}
            loading={syncMutation.isPending}
            size="sm"
          >
            Sync with OpenRouter
          </Button>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Filter models..."
              className="h-9 w-64 rounded-md border bg-background px-3"
              value={textFilter}
              onChange={(e) => {
                const value = e.target.value;
                setTextFilter(value);
                setStorageItem(storageKeys.manageQuery, value);
              }}
            />
            <label className="text-sm text-muted-foreground">Provider</label>
            <Select
              value={providerFilter}
              onValueChange={(v) => {
                setProviderFilter(v);
                setStorageItem(storageKeys.manageProvider, v);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {providerTiers.map((tier) => (
                  <div key={tier}>
                    <div className="px-2 py-1.5 text-xs font-medium text-green-500">
                      {tier}
                    </div>
                    {providers
                      ?.filter((p) => p.tier === tier)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                          <span className="text-xs text-muted-foreground">
                            {providerCounts[p.id]}
                          </span>
                        </SelectItem>
                      ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
            <label className="text-sm text-muted-foreground">Tier</label>
            <Select
              value={tierFilter}
              onValueChange={(v) => {
                setTierFilter(v);
                setStorageItem(storageKeys.manageTier, v);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                {providerTiers.map((tier) => (
                  <SelectItem key={tier} value={tier}>
                    {tier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-2 flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  priorityOnly
                    ? "bg-green-500/10 border-green-500/30 text-green-600"
                    : "border-transparent text-muted-foreground hover:bg-accent"
                )}
                aria-pressed={priorityOnly}
                title="Filter: Priority"
                onClick={() => {
                  const next = !priorityOnly;
                  setPriorityOnly(next);
                  setStorageItem(storageKeys.managePriority, next);
                }}
              >
                <Hash className="h-4 w-4" />
                <span className="hidden sm:inline">Priority</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  deletedOnly
                    ? "bg-green-500/10 border-green-500/30 text-green-600"
                    : "border-transparent text-muted-foreground hover:bg-accent"
                )}
                aria-pressed={deletedOnly}
                title="Filter: Deleted"
                onClick={() => {
                  const next = !deletedOnly;
                  setDeletedOnly(next);
                  setStorageItem(storageKeys.manageDeleted, next);
                }}
              >
                <XSquareIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Deleted</span>
              </Button>
            </div>
          </div>
        </div>

        <QueryAlert error={listError || syncMutation.error} />

        <div className="rounded-md border">
          {isLoading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <DataTable
              columns={columns}
              data={filtered}
              sorting={sorting}
              onSortingChange={(s) => {
                setSorting(s);
                setStorageItem(storageKeys.manageSort, s);
              }}
              getRowLink={(row) => {
                return `/manage/models/${encodeURIComponent(row.id)}`;
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelsPageClient;

function MathMinMax(num: number, min: number, max: number) {
  return Math.max(min, Math.min(max, num));
}
