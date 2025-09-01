"use client";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { QueryAlert } from "@/components/ui/query-alert";
import { trpc } from "@/lib/trpc/client";
import type { ModelsListOutput } from "@/lib/trpc/server/server";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import type { NextPage } from "next";
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
  const { data: hydrated, error: listError } = trpc.models.list.useQuery();
  const utils = trpc.useUtils();
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

  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [textFilter, setTextFilter] = useState<string>("");
  const [sorting, setSorting] = useState<SortingState>(() => {
    return [];
  });

  const onSync = () => {
    syncMutation.mutateAsync().catch(() => {
      // Error will be displayed using <QueryAlert />
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

  const providers = hydrated?.providers;
  const models = hydrated?.models;
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
            }}
          />
          <label className="text-sm text-muted-foreground">Provider</label>
          <select
            className="border rounded-md h-9 px-3 bg-background"
            value={providerFilter}
            onChange={(e) => {
              setProviderFilter(e.target.value);
            }}
          >
            <option value="all">All</option>
            {providers?.map((p) => (
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
      <QueryAlert error={listError || syncMutation.error} />
      <div className="rounded-md border">
        <DataTable
          columns={columns}
          data={filtered}
          sorting={sorting}
          onSortingChange={(s) => {
            setSorting(s);
          }}
          getRowLink={(row) => {
            return `/manage/models/${encodeURIComponent(row.id)}`;
          }}
        />
      </div>
    </div>
  );
};

export default ManagePageClient;
