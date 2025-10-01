"use client";

import { AdminHeader } from "@/components/ui/admin-header";
import { DataTable } from "@/components/ui/data-table";
import { QueryAlert } from "@/components/ui/query-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc/client";
import type { UsersManageListOutput } from "@/lib/trpc/server/server";
import type { ColumnDef } from "@tanstack/react-table";
import type { NextPage } from "next";
import { useMemo } from "react";

const ManageUsersPageClient: NextPage = () => {
  const { data, error, isLoading, isFetching, refetch } =
    trpc.users.manageList.useQuery();

  const columns: ColumnDef<UsersManageListOutput[number]>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "User",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex flex-col">
              <span className="font-medium">{user.name}</span>
              <span className="text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "countries",
        header: "Location",
        cell: ({ row }) => (
          <>
            {row.original.countries?.join(", ")}
            <br />
            {row.original.continents?.join(", ")}
          </>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Signup Date",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        accessorKey: "lastLoginAt",
        header: "Last Login",
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">
            {formatDate(row.original.lastLoginAt) || "—"}
            <br />
            7d: {row.original.activeDaysCount}
          </span>
        ),
      },
      {
        accessorKey: "chatsCount",
        header: "Activity (7d)",
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">
            chats: {row.original.chatsCount}
            <br />
            completions: {row.original.completionsCount}
          </span>
        ),
      },
      {
        accessorKey: "costLast7",
        header: "Cost",
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">
            7d: {formatCurrency(row.original.costLast7)}
            <br />
            30d: {formatCurrency(row.original.costLast30)}
          </span>
        ),
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl p-6">
        <div className="mb-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <AdminHeader
        title="Manage Users"
        description="Activity and cost metrics for the last 7 days."
        onRefetch={refetch}
        isFetching={isFetching}
      />

      <QueryAlert error={error} />

      <div className="rounded-md border">
        <DataTable columns={columns} data={data ?? []} />
      </div>
    </div>
  );
};

export default ManageUsersPageClient;
