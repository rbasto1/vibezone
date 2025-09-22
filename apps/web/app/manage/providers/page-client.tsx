"use client";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { QueryAlert } from "@/components/ui/query-alert";
import { Skeleton } from "@/components/ui/skeleton";
import type { Provider, ProviderTier } from "@/db";
import { trpc } from "@/lib/trpc/client";
import type { ProvidersListOutput } from "@/lib/trpc/server/server";
import type { ColumnDef, Row, SortingState } from "@tanstack/react-table";
import { cn } from "@/components/ui/utils";
import { Crown, Rocket, ShieldAlertIcon, Trash2, Wrench } from "lucide-react";
import type { NextPage } from "next";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const ProviderManagePageClient: NextPage = () => {
  const { data, error, isLoading } = trpc.providers.list.useQuery(undefined, {
    placeholderData: (data) => data,
  });
  const utils = trpc.useUtils();
  const update = trpc.providers.update.useMutation();
  const deleteMutation = trpc.providers.delete.useMutation({
    onSuccess: async () => {
      await utils.providers.list.invalidate().catch(() => {
        toast.error("Failed to invalidate providers list");
      });
    },
  });
  const [q, setQ] = useState("");

  const columns: ColumnDef<ProvidersListOutput[number]>[] = useMemo(
    (): ColumnDef<ProvidersListOutput[number]>[] => [
      { accessorKey: "id", header: "ID" },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div
              className="w-full"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Input
                defaultValue={p.name}
                className="h-8 w-full max-w-[280px]"
                aria-label={`Provider ${p.id} name`}
                onBlur={(e) => {
                  const next = e.currentTarget.value.trim();
                  if (!next || next === p.name) {
                    // restore visual value if emptied
                    if (!next) e.currentTarget.value = p.name;
                    return;
                  }
                  // optimistic update
                  utils.providers.list.setData(undefined, (prev) =>
                    prev?.map((x) => (x.id === p.id ? { ...x, name: next } : x))
                  );
                  update.mutateAsync({ id: p.id, name: next }).catch(() => {
                    // revert on error
                    utils.providers.list.setData(undefined, (prev) =>
                      prev?.map((x) =>
                        x.id === p.id ? { ...x, name: p.name } : x
                      )
                    );
                    e.currentTarget.value = p.name;
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  } else if (e.key === "Escape") {
                    e.currentTarget.value = p.name;
                    e.currentTarget.blur();
                  }
                }}
              />
            </div>
          );
        },
      },
      {
        accessorKey: "order",
        header: "Order",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div
              className="w-full"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Input
                type="number"
                defaultValue={String(p.order ?? "")}
                className="h-8 w-16"
                aria-label={`Provider ${p.id} order`}
                placeholder="Order"
                onBlur={(e) => {
                  const trimmed = e.currentTarget.value.trim();
                  const next =
                    trimmed === "" ? null : Number.parseInt(trimmed, 10);
                  if (next !== null && Number.isNaN(next)) return; // ignore invalid
                  if (next === p.order) return; // no change

                  // optimistic update
                  utils.providers.list.setData(undefined, (prev) =>
                    prev?.map((x) =>
                      x.id === p.id ? { ...x, order: next } : x
                    )
                  );
                  update
                    .mutateAsync({ id: p.id, order: next })
                    .catch((error) => {
                      console.error("Order update failed:", error);
                      // revert on error
                      utils.providers.list.setData(undefined, (prev) =>
                        prev?.map((x) =>
                          x.id === p.id ? { ...x, order: p.order } : x
                        )
                      );
                      e.currentTarget.value = String(p.order ?? "");
                    });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  } else if (e.key === "Escape") {
                    e.currentTarget.value = String(p.order ?? "");
                    e.currentTarget.blur();
                  }
                }}
              />
            </div>
          );
        },
      },
      {
        accessorKey: "tier",
        header: "Tier",
        sortingFn: sortTier,
        cell: ({ row }) => {
          const p = row.original;
          const setTier = (
            value: "leaders" | "challengers" | "specialists"
          ) => {
            // optimistic update
            utils.providers.list.setData(undefined, (prev) =>
              prev?.map((x) => (x.id === p.id ? { ...x, tier: value } : x))
            );
            update.mutateAsync({ id: p.id, tier: value }).catch(() => {
              // revert on error
              utils.providers.list.setData(undefined, (prev) =>
                prev?.map((x) => (x.id === p.id ? { ...x, tier: p.tier } : x))
              );
            });
          };
          const TierButton = ({
            active,
            children,
            onClick,
            title,
          }: {
            active: boolean;
            children: React.ReactNode;
            onClick: () => void;
            title: string;
          }) => (
            <button
              type="button"
              className={
                "inline-flex items-center gap-1 rounded px-2 py-1 border text-xs transition-colors " +
                (active
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-transparent text-muted-foreground hover:bg-accent")
              }
              aria-pressed={active}
              title={title}
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {children}
            </button>
          );
          return (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <TierButton
                active={p.tier === "leaders"}
                onClick={() => setTier("leaders")}
                title="Leaders"
              >
                <Crown className="h-4 w-4" />
                <span className="hidden sm:inline">Leaders</span>
              </TierButton>
              <TierButton
                active={p.tier === "challengers"}
                onClick={() => setTier("challengers")}
                title="Challengers"
              >
                <Rocket className="h-4 w-4" />
                <span className="hidden sm:inline">Challengers</span>
              </TierButton>
              <TierButton
                active={p.tier === "specialists"}
                onClick={() => setTier("specialists")}
                title="Specialists"
              >
                <Wrench className="h-4 w-4" />
                <span className="hidden sm:inline">Specialists</span>
              </TierButton>
            </div>
          );
        },
      },
      {
        accessorKey: "dataRetention",
        header: "Retention",
        cell: ({ row }) => {
          const p = row.original;
          const current = Boolean(p.dataRetention);
          const toggle = () => {
            const next = !current;
            utils.providers.list.setData(undefined, (prev) =>
              prev?.map((provider) =>
                provider.id === p.id
                  ? { ...provider, dataRetention: next }
                  : provider
              )
            );
            update
              .mutateAsync({ id: p.id, dataRetention: next })
              .catch((error) => {
                utils.providers.list.setData(undefined, (prev) =>
                  prev?.map((provider) =>
                    provider.id === p.id
                      ? { ...provider, dataRetention: current }
                      : provider
                  )
                );
                const message =
                  error instanceof Error ? error.message : String(error);
                toast.error(`Failed to update data retention: ${message}`);
              });
          };

          return (
            <Button
              type="button"
              variant="outline"
              className={cn(
                "transition-colors",
                current
                  ? "bg-red-500/10 border-red-500/30 text-red-500"
                  : "border-transparent text-muted-foreground hover:bg-accent"
              )}
              aria-pressed={current}
              title={
                current
                  ? "Provider may retain data"
                  : "Provider does not retain data"
              }
              onClick={(e) => {
                e.stopPropagation();
                toggle();
              }}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <ShieldAlertIcon className="h-4 w-4" />
            </Button>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded px-2 py-1 border border-red-500/30 text-red-600 hover:bg-red-500/10 transition-colors"
              title="Delete provider"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteMutation.mutateAsync({ id: p.id }).catch((e) => {
                  const message = e instanceof Error ? e.message : String(e);
                  toast.error(`Failed to delete provider: ${message}`);
                });
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          );
        },
      },
    ],
    [update, deleteMutation, utils]
  );

  const [sorting, setSorting] = useState<SortingState>([
    { id: "tier", desc: false },
  ]);

  const filtered = useMemo(() => {
    const list = data ?? [];
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter(
      (p) => p.id.toLowerCase().includes(t) || p.name.toLowerCase().includes(t)
    );
  }, [data, q]);

  return (
    <div>
      <div className="mx-auto max-w-[1200px] p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Provider Management</h1>
          <input
            type="text"
            placeholder="Filter providers..."
            className="h-9 w-64 rounded-md border bg-background px-3"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <QueryAlert error={error} />
        <div className="rounded-md border">
          {isLoading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <DataTable
              columns={columns}
              data={filtered}
              sorting={sorting}
              onSortingChange={setSorting}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderManagePageClient;

function formatDate(value?: string | Date | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

const tierPriority: Record<ProviderTier, number> = {
  leaders: 1,
  challengers: 2,
  specialists: 3,
};

function sortTier(a: Row<Provider>, b: Row<Provider>) {
  if (!a.original.tier || !b.original.tier) return 0;
  return tierPriority[a.original.tier] - tierPriority[b.original.tier];
}
