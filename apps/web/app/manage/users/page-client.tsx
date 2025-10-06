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

  const totals = useMemo(
    () => {
      if (!data?.length) {
        return {
          users: 0,
          loginsLast7: 0,
          chatsLast7: 0,
          completionsLast7: 0,
          cost7: 0,
          cost30: 0,
        };
      }

      return data.reduce(
        (acc, user) => {
          acc.users += 1;
          acc.loginsLast7 += user.sessionsLast7 ?? 0;
          acc.chatsLast7 += user.chatsCount ?? 0;
          acc.completionsLast7 += user.completionsCount ?? 0;
          acc.cost7 += Number(user.costLast7 ?? 0);
          acc.cost30 += Number(user.costLast30 ?? 0);
          return acc;
        },
        {
          users: 0,
          loginsLast7: 0,
          chatsLast7: 0,
          completionsLast7: 0,
          cost7: 0,
          cost30: 0,
        }
      );
    },
    [data]
  );

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
        footer: () => <span className="font-medium">Total</span>,
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
        footer: () => (
          <span className="block text-right tabular-nums">
            users: {totals.users}
            <br />
            logins: {totals.loginsLast7}
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
        footer: () => (
          <span className="block text-right tabular-nums">
            chats: {totals.chatsLast7}
            <br />
            completions: {totals.completionsLast7}
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
        footer: () => (
          <span className="block text-right tabular-nums">
            7d: {formatCurrency(totals.cost7)}
            <br />
            30d: {formatCurrency(totals.cost30)}
          </span>
        ),
      },
    ],
    [totals]
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
