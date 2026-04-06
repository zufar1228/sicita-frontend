"use client";

import * as React from "react";
import {
  ColumnDef,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  PaginationState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableViewOptions } from "./data-table-column-toggle";
import { DataTablePagination } from "./data-table-pagination";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton"; // <-- Impor Skeleton

// ▼▼▼ 1. Tambahkan prop `isLoading` (opsional) ke interface ▼▼▼
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  className?: string;
  defaultSortColumnId?: string;
  pageCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: React.Dispatch<React.SetStateAction<PaginationState>>;
  isLoading?: boolean; // <-- Tambahkan ini
}

export function DataTable<TData, TValue>({
  columns,
  data,
  className,
  defaultSortColumnId = "timestamp",
  pageCount,
  pagination,
  onPaginationChange,
  isLoading, // <-- 2. Ambil prop `isLoading` di sini
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(
    defaultSortColumnId ? [{ id: defaultSortColumnId, desc: true }] : []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [clientSidePagination, setClientSidePagination] =
    React.useState<PaginationState>({
      pageIndex: 0,
      pageSize: 10,
    });

  const isServerSidePagination = !!(
    pageCount !== undefined &&
    pagination &&
    onPaginationChange
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    manualPagination: isServerSidePagination,
    pageCount: isServerSidePagination ? pageCount : -1,
    onPaginationChange: isServerSidePagination
      ? onPaginationChange
      : setClientSidePagination,
    state: {
      sorting,
      columnVisibility,
      pagination: isServerSidePagination ? pagination : clientSidePagination,
    },
    initialState: {
      sorting: defaultSortColumnId
        ? [{ id: defaultSortColumnId, desc: true }]
        : [],
    },
  });

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-2 py-2 md:flex-row md:items-center md:justify-start">
        <div className="w-full md:w-auto flex justify-start">
          <DataTableViewOptions table={table} />
        </div>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      width:
                        header.getSize() !== 150 ? header.getSize() : undefined,
                    }}
                    className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          {/* ▼▼▼ 3. Tambahkan logika untuk menampilkan skeleton saat loading ▼▼▼ */}
          <TableBody>
            {isLoading ? (
              // Tampilkan baris skeleton sebanyak 5
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={columns.length}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              // Jika tidak loading dan ada data, tampilkan data
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        width:
                          cell.column.getSize() !== 150
                            ? cell.column.getSize()
                            : undefined,
                      }}
                      className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              // Jika tidak loading dan tidak ada data
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Tidak ada data ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
