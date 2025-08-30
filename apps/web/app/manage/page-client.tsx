"use client";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QueryAlert } from "@/components/ui/query-alert";
import { trpc } from "@/lib/trpc/client";
import type {
  ModelsListOutput,
  ModelsSyncFromOpenRouterOutput,
} from "@/lib/trpc/server/server";
import { modelsAtom } from "@/store/models";
import type {
  ColumnDef,
  ColumnSort,
  SortingState,
} from "@tanstack/react-table";
import { useAtomValue, useSetAtom } from "jotai";
import type { NextPage } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function formatDate(value?: string | Date | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

const ManagePageClient: NextPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const hydrated = useAtomValue(modelsAtom);
  const setModels = useSetAtom(modelsAtom);
  const utils = trpc.useUtils();
  const syncMutation = trpc.models.syncFromOpenRouter.useMutation({
    onSuccess: async (res) => {
      try {
        const refreshed = await utils.models.list.fetch();
        setModels(refreshed);
        setLastResult(res);
        toast.success(
          `Sync complete: providers ${res.providersUpserted}, models ${res.modelsUpserted}, soft-deleted ${res.softDeleted}.`
        );
      } catch {
        setLastResult(res);
        toast.error("Failed to refresh models after sync. Try reloading.");
      }
    },
    onError: (err) => {
      const message = err?.message || "Sync failed";
      toast.error(message);
    },
  });

  const [showSync, setShowSync] = useState(false);
  const [lastResult, setLastResult] =
    useState<ModelsSyncFromOpenRouterOutput>();
  const [errorResult, setErrorResult] = useState<string>();
  const [providerFilter, setProviderFilter] = useState<string>(
    searchParams.get("provider") ?? "all"
  );
  const [textFilter, setTextFilter] = useState<string>(
    searchParams.get("q") ?? ""
  );
  const [sorting, setSorting] = useState<SortingState>(() => {
    const raw = searchParams.get("sort");
    if (!raw) return [];
    return raw.split(",").map((p): ColumnSort => {
      const [id, dir] = p.split(":");
      if (!id) throw new Error("Assert: empty id");
      return { id, desc: dir === "desc" };
    });
  });

  // sync state -> URL
  const syncQuery = (pf = providerFilter, tf = textFilter, s = sorting) => {
    const qp = new URLSearchParams(searchParams.toString());
    if (pf && pf !== "all") qp.set("provider", pf);
    else qp.delete("provider");
    if (tf) qp.set("q", tf);
    else qp.delete("q");
    if (s.length)
      qp.set(
        "sort",
        s.map((x) => `${x.id}:${x.desc ? "desc" : "asc"}`).join(",")
      );
    else qp.delete("sort");
    router.replace(`${pathname}?${qp.toString()}`);
  };

  const onSync = () => {
    setShowSync(true);
    setLastResult(undefined);
    syncMutation
      .mutateAsync()
      .then(setLastResult)
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        setErrorResult(message);
        toast.error(message);
      });
  };

  const columns: ColumnDef<ModelsListOutput["models"][number]>[] = useMemo(
    () => [
      { accessorKey: "id", header: "ID" },
      { accessorKey: "providerId", header: "Provider" },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => row.original.name,
      },
      {
        header: "Modality",
        cell: ({ row }) => row.original.architectureModality,
      },
      {
        header: "Input",
        cell: ({ row }) =>
          (row.original.architectureInputModalities ?? []).join(", "),
      },
      {
        header: "Output",
        cell: ({ row }) =>
          (row.original.architectureOutputModalities ?? []).join(", "),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
    ],
    []
  );

  const { providers, models } = hydrated;
  const sortedProviders = useMemo(
    () => [...providers].sort((a, b) => a.name.localeCompare(b.name)),
    [providers]
  );
  const providerCounts = useMemo(() => {
    if (!models) return {};
    const counts: Record<string, number> = {};
    for (const m of models)
      counts[m.providerId] = (counts[m.providerId] || 0) + 1;
    return counts;
  }, [models]);
  const filtered = useMemo(() => {
    if (!models) return [];
    const byProvider =
      providerFilter === "all"
        ? models
        : models.filter((m) => m.providerId === providerFilter);
    const q = textFilter.trim().toLowerCase();
    if (!q) return byProvider;
    return byProvider.filter((m) => {
      if (m.id.toLowerCase().includes(q)) return true;
      if ((m.name || "").toLowerCase().includes(q)) return true;
      if (m.providerId.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [models, providerFilter, textFilter]);

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
              const qp = new URLSearchParams(searchParams.toString());
              if (value) qp.set("q", value);
              else qp.delete("q");
              router.replace(`${pathname}?${qp.toString()}`);
            }}
          />
          <label className="text-sm text-muted-foreground">Provider</label>
          <select
            className="border rounded-md h-9 px-3 bg-background"
            value={providerFilter}
            onChange={(e) => {
              setProviderFilter(e.target.value);
              syncQuery(e.target.value);
            }}
          >
            <option value="all">All</option>
            {sortedProviders.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({providerCounts[p.id] ?? 0})
              </option>
            ))}
          </select>
          <Button onClick={onSync} loading={syncMutation.isPending}>
            Sync with OpenRouter
          </Button>
        </div>
      </div>
      <QueryAlert error={syncMutation.error} />
      <div className="rounded-md border">
        <DataTable
          columns={columns}
          data={filtered}
          sorting={sorting}
          onSortingChange={(s) => {
            setSorting(s);
            syncQuery(undefined, undefined, s);
          }}
          getRowLink={(row) => {
            const q = new URLSearchParams();
            if (providerFilter && providerFilter !== "all")
              q.set("provider", providerFilter);
            if (textFilter) q.set("q", textFilter);
            if (sorting.length)
              q.set(
                "sort",
                sorting
                  .map((x) => `${x.id}:${x.desc ? "desc" : "asc"}`)
                  .join(",")
              );
            return `/manage/models/${encodeURIComponent(row.id)}?${q.toString()}`;
          }}
        />
      </div>

      {showSync ? (
        <Dialog
          onOpenChange={(open) => {
            if (!open) setShowSync(false);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sync Results</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              {syncMutation.isPending && (
                <p>Syncing models from OpenRouter...</p>
              )}
              {!syncMutation.isPending && lastResult && (
                <ul className="list-disc pl-5">
                  <li>Providers upserted: {lastResult.providersUpserted}</li>
                  <li>Models upserted: {lastResult.modelsUpserted}</li>
                  <li>Soft-deleted: {lastResult.softDeleted}</li>
                  <li>Parameters seen: {lastResult.parametersSeen}</li>
                </ul>
              )}
              {!syncMutation.isPending && errorResult && (
                <p className="text-destructive">{errorResult}</p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setShowSync(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
};

export default ManagePageClient;
