import { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  return (
    // MODIFIKASI 1: Kontainer utama pagination
    // - Default: flex-col (susun vertikal), items-center (pusatkan item saat vertikal)
    // - sm (small screens and up): flex-row, justify-between (susun horizontal, beri jarak)
    // - gap-4: beri jarak antar elemen baik vertikal maupun horizontal
    <div className="flex flex-col items-center gap-4 px-2 py-2 sm:flex-row sm:justify-between">
      {/* MODIFIKASI 2: Info jumlah baris */}
      {/* - sm:flex-1: Biarkan mengambil ruang sisa hanya pada layar sm ke atas */}
      {/* - text-center sm:text-left: Pusatkan teks di mobile, ratakan kiri di desktop */}
      <div className="text-sm text-muted-foreground text-center sm:text-left sm:flex-1">
        {/* {table.getFilteredSelectedRowModel().rows.length} of{" "} */}
        {table.getFilteredRowModel().rows.length} row(s).
      </div>

      {/* MODIFIKASI 3: Kontainer untuk kontrol sisi kanan */}
      {/* - flex-wrap: Ini kunci agar item di dalamnya bisa wrap (pindah ke bawah) */}
      {/* - justify-center sm:justify-end: Pusatkan item di mobile, ratakan kanan di desktop */}
      {/* - gap-x-4 lg:gap-x-6: Jarak horizontal antar item (berbeda untuk layar besar) */}
      {/* - gap-y-2: Jarak vertikal jika item wrap */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-end lg:gap-x-6">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        {/* Grup tombol navigasi halaman akan wrap sebagai satu kesatuan jika diperlukan */}
        <div className="flex items-center space-x-2">
          <Button
            className="hidden h-8 w-8 p-0 lg:flex border-white-400" // Tetap tersembunyi di mobile, muncul di lg
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            className="h-8 w-8 p-0 border-white-600 "
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            className="h-8 w-8 p-0 border-white-700"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            className="hidden h-8 w-8 p-0 lg:flex border-white-400" // Tetap tersembunyi di mobile, muncul di lg
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
