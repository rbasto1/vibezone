"use client";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { QueryAlert } from "@/components/ui/query-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import type { ModelsListOutput } from "@/lib/trpc/server/server";
import type { ColumnDef } from "@tanstack/react-table";
import { Code2, Palette, Star, StarOff } from "lucide-react";
import type { NextPage } from "next";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { getStorageItem, setStorageItem, storageKeys } from "./session-storage";

const SortingSchema = z
  .array(
    z.object({
      id: z.string(),
      desc: z.boolean(),
    })
  )
  .optional();

interface ManagePageClientProps {
  initialModels: ModelsListOutput;
}

const ManagePageClient: NextPage<ManagePageClientProps> = ({
  initialModels,
}) => {
  const {
    data: hydrated,
    error: listError,
    isLoading,
  } = trpc.models.list.useQuery(undefined, {
    initialData: initialModels,
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
  const utils = trpc.useUtils();
  const updateMutation = trpc.models.update.useMutation();
  const syncMutation = trpc.models.syncFromOpenRouter.useMutation({
    onSuccess: async (res) => {
      await utils.models.list.invalidate().catch(() => {
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
  const [flagshipOnly, setFlagshipOnly] = useState(
    () => getStorageItem(storageKeys.manageFlagship, z.boolean()) ?? false
  );
  const [coderOnly, setCoderOnly] = useState(
    () => getStorageItem(storageKeys.manageCoder, z.boolean()) ?? false
  );
  const [artistOnly, setArtistOnly] = useState(
    () => getStorageItem(storageKeys.manageArtist, z.boolean()) ?? false
  );

  const columns: ColumnDef<ModelsListOutput["models"][number]>[] = useMemo(
    () => [
      { accessorKey: "id", header: "ID" },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => row.original.name,
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "edit",
        header: "Edit",
        cell: ({ row }) => {
          const m = row.original;
          const setCacheFields = (patch: Partial<typeof m>) => {
            utils.models.list.setData(undefined, (prev) => {
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
            key: "isFlagship" | "isCoder" | "isArtist",
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
              <label className="flex items-center gap-1">
                <span className="text-muted-foreground">Prio</span>
                <input
                  type="number"
                  className="w-16 h-8 rounded border bg-background px-2"
                  value={m.priority ?? ""}
                  onChange={(e) => onPriorityChange(e.target.value)}
                />
              </label>

              <button
                type="button"
                className={
                  "inline-flex items-center gap-1 rounded px-2 py-1 border transition-colors " +
                  (m.isFlagship
                    ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-600"
                    : "border-transparent text-muted-foreground hover:bg-accent")
                }
                aria-pressed={!!m.isFlagship}
                title="Flagship"
                onClick={() => onToggle("isFlagship", !m.isFlagship)}
              >
                {m.isFlagship ? (
                  <Star className="h-4 w-4" />
                ) : (
                  <StarOff className="h-4 w-4" />
                )}
              </button>

              <button
                type="button"
                className={
                  "inline-flex items-center gap-1 rounded px-2 py-1 border transition-colors " +
                  (m.isCoder
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-transparent text-muted-foreground hover:bg-accent")
                }
                aria-pressed={!!m.isCoder}
                title="Coder"
                onClick={() => onToggle("isCoder", !m.isCoder)}
              >
                <Code2 className="h-4 w-4" />
              </button>

              <button
                type="button"
                className={
                  "inline-flex items-center gap-1 rounded px-2 py-1 border transition-colors " +
                  (m.isArtist
                    ? "bg-pink-500/10 border-pink-500/30 text-pink-600"
                    : "border-transparent text-muted-foreground hover:bg-accent")
                }
                aria-pressed={!!m.isArtist}
                title="Artist"
                onClick={() => onToggle("isArtist", !m.isArtist)}
              >
                <Palette className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [utils, updateMutation]
  );

  const providers = hydrated?.providers;
  const models = hydrated?.models;
  const leaderProviders = useMemo(
    () =>
      providers
        ?.filter((p) => p.tier === "leaders")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [providers]
  );
  const secondTierProviders = useMemo(
    () =>
      providers
        ?.filter((p) => p.tier !== "leaders")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [providers]
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
      if (flagshipOnly && !m.isFlagship) return false;
      if (coderOnly && !m.isCoder) return false;
      if (artistOnly && !m.isArtist) return false;
      return true;
    });
  }, [models, providerFilter, textFilter, flagshipOnly, coderOnly, artistOnly]);

  return (
    <div className="mx-auto max-w-[1200px] p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Model Management</h1>
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
          <select
            className="border rounded-md h-9 px-3 bg-background"
            value={providerFilter}
            onChange={(e) => {
              const v = e.target.value;
              setProviderFilter(v);
              setStorageItem(storageKeys.manageProvider, v);
            }}
          >
            <option value="all">All</option>
            {leaderProviders.length > 0 && (
              <optgroup label="Leaders">
                {leaderProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({providerCounts[p.id] ?? 0})
                  </option>
                ))}
              </optgroup>
            )}
            {secondTierProviders.length > 0 && (
              <optgroup label="Second Tier">
                {secondTierProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({providerCounts[p.id] ?? 0})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <Button
            onClick={() => syncMutation.mutateAsync()}
            loading={syncMutation.isPending}
          >
            Sync with OpenRouter
          </Button>
          <div className="ml-2 flex items-center gap-2">
            <button
              type="button"
              className={
                "inline-flex items-center gap-1 rounded px-2 py-1 border transition-colors text-sm " +
                (flagshipOnly
                  ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-600"
                  : "border-transparent text-muted-foreground hover:bg-accent")
              }
              aria-pressed={flagshipOnly}
              title="Filter: Flagship"
              onClick={() => {
                const next = !flagshipOnly;
                setFlagshipOnly(next);
                setStorageItem(
                  storageKeys.manageFlagship,
                  JSON.stringify(next)
                );
              }}
            >
              {flagshipOnly ? (
                <Star className="h-4 w-4" />
              ) : (
                <StarOff className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Flagship</span>
            </button>
            <button
              type="button"
              className={
                "inline-flex items-center gap-1 rounded px-2 py-1 border transition-colors text-sm " +
                (coderOnly
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-transparent text-muted-foreground hover:bg-accent")
              }
              aria-pressed={coderOnly}
              title="Filter: Coder"
              onClick={() => {
                const next = !coderOnly;
                setCoderOnly(next);
                setStorageItem(storageKeys.manageCoder, JSON.stringify(next));
              }}
            >
              <Code2 className="h-4 w-4" />
              <span className="hidden sm:inline">Coder</span>
            </button>
            <button
              type="button"
              className={
                "inline-flex items-center gap-1 rounded px-2 py-1 border transition-colors text-sm " +
                (artistOnly
                  ? "bg-pink-500/10 border-pink-500/30 text-pink-600"
                  : "border-transparent text-muted-foreground hover:bg-accent")
              }
              aria-pressed={artistOnly}
              title="Filter: Artist"
              onClick={() => {
                const next = !artistOnly;
                setArtistOnly(next);
                setStorageItem(storageKeys.manageArtist, JSON.stringify(next));
              }}
            >
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Artist</span>
            </button>
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
              setStorageItem(storageKeys.manageSort, JSON.stringify(s));
            }}
            getRowLink={(row) => {
              return `/manage/models/${encodeURIComponent(row.id)}`;
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ManagePageClient;

function formatDate(value?: string | Date | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}
