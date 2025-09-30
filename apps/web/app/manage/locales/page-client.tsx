"use client";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { QueryAlert } from "@/components/ui/query-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/ui/utils";
import { trpc } from "@/lib/trpc/client";
import type { LocalesListOutput } from "@/lib/trpc/server/server";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, Trash2Icon, X } from "lucide-react";
import type { NextPage } from "next";
import { useMemo } from "react";
import { toast } from "sonner";
import { AddLocale } from "./AddLocale";

const LocalesManagePageClient: NextPage = () => {
  const { data, error, isLoading } = trpc.locales.list.useQuery();
  const utils = trpc.useUtils();
  const update = trpc.locales.update.useMutation();
  const deleteMutation = trpc.locales.delete.useMutation({
    onSuccess: async () => {
      await utils.locales.list.invalidate().catch(() => {
        toast.error("Failed to refresh locales list");
      });
    },
  });

  const columns: ColumnDef<LocalesListOutput[number]>[] = useMemo(
    () => [
      { accessorKey: "id", header: "ID" },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
          const locale = row.original;
          return (
            <div
              className="w-full"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Input
                defaultValue={locale.name}
                className="h-8 w-full max-w-[280px]"
                aria-label={`Locale ${locale.id} name`}
                onBlur={(e) => {
                  const next = e.currentTarget.value.trim();
                  if (!next || next === locale.name) {
                    if (!next) e.currentTarget.value = locale.name;
                    return;
                  }
                  // Optimistic update
                  utils.locales.list.setData(undefined, (prev) =>
                    prev?.map((x) =>
                      x.id === locale.id ? { ...x, name: next } : x
                    )
                  );
                  update
                    .mutateAsync({ id: locale.id, name: next })
                    .catch(() => {
                      // Revert on error
                      utils.locales.list.setData(undefined, (prev) =>
                        prev?.map((x) =>
                          x.id === locale.id ? { ...x, name: locale.name } : x
                        )
                      );
                      e.currentTarget.value = locale.name;
                    });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  } else if (e.key === "Escape") {
                    e.currentTarget.value = locale.name;
                    e.currentTarget.blur();
                  }
                }}
              />
            </div>
          );
        },
      },
      {
        accessorKey: "available",
        header: "Available",
        cell: ({ row }) => {
          const locale = row.original;
          return (
            <div className="flex items-center justify-center">
              <button
                type="button"
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full transition-colors cursor-pointer",
                  locale.available
                    ? "bg-green-100 text-green-600 hover:bg-green-200"
                    : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                )}
                onClick={() => {
                  const newValue = !locale.available;
                  // Optimistic update
                  utils.locales.list.setData(undefined, (prev) =>
                    prev?.map((x) =>
                      x.id === locale.id ? { ...x, available: newValue } : x
                    )
                  );
                  update
                    .mutateAsync({ id: locale.id, available: newValue })
                    .catch(() => {
                      // Revert on error
                      utils.locales.list.setData(undefined, (prev) =>
                        prev?.map((x) =>
                          x.id === locale.id
                            ? { ...x, available: locale.available }
                            : x
                        )
                      );
                    });
                }}
              >
                {locale.available ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </button>
            </div>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const locale = row.original;
          return (
            <div className="flex justify-end">
              <Button
                variant="destructive"
                type="button"
                onClick={async () => {
                  if (
                    !confirm(
                      `Are you sure you want to delete locale "${locale.name}"?`
                    )
                  ) {
                    return;
                  }
                  await deleteMutation.mutateAsync({ id: locale.id });
                  toast.success(`Locale "${locale.name}" deleted`);
                }}
              >
                <Trash2Icon className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [deleteMutation, update, utils.locales.list]
  );

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <QueryAlert error={error} />
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-[600px] p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Manage Locales</h1>
        </div>

        <div className="rounded-md border">
          <DataTable columns={columns} data={data || []} />
        </div>

        <AddLocale />
      </div>
    </div>
  );
};

export default LocalesManagePageClient;
