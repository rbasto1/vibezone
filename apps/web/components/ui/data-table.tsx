"use client";

import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";
import { useRouter } from "next/navigation";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  sorting?: SortingState;
  onSortingChange?: (updater: SortingState) => void;
  getRowLink?: (row: TData) => string | undefined;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  sorting: sortingProp,
  onSortingChange,
  getRowLink,
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const [sortingState, setSortingState] = React.useState<SortingState>([]);
  const sorting = sortingProp ?? sortingState;
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      if (onSortingChange) return onSortingChange(updater as SortingState);
      setSortingState(updater as SortingState);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left font-medium select-none"
                >
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <button
                      className="inline-flex items-center gap-1 hover:underline"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      <SortIndicator dir={header.column.getIsSorted()} />
                    </button>
                  ) : (
                    flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={
                  "border-b hover:bg-accent/40 " +
                  (getRowLink ? "cursor-pointer" : "")
                }
                tabIndex={getRowLink ? 0 : -1}
                onClick={() => {
                  if (!getRowLink) return;
                  const href = getRowLink(row.original as TData);
                  if (href) router.push(href);
                }}
                onKeyDown={(e) => {
                  if (!getRowLink) return;
                  if (e.key === "Enter" || e.key === " ") {
                    const href = getRowLink(row.original as TData);
                    if (href) router.push(href);
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No results.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SortIndicator({
  dir,
}: {
  dir: false | "asc" | "desc";
}) {
  if (dir === "asc") return <span aria-hidden>▲</span>;
  if (dir === "desc") return <span aria-hidden>▼</span>;
  return <span aria-hidden className="opacity-40">⇵</span>;
}
