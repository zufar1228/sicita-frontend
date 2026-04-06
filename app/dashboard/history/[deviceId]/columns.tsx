// app/dashboard/history/[deviceId]/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { SensorData } from "@/types/sensor"; // Pastikan path ini benar
import { DataTableColumnHeader } from "@/components/data-table-column-header";

// Helper untuk format tanggal (bisa diletakkan di utils)
const formatTimestamp = (timestamp: string | Date): string => {
  return new Date(timestamp).toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const columns: ColumnDef<SensorData>[] = [
  {
    accessorKey: "timestamp",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Timestamp" />
    ),
    cell: ({ row }) => formatTimestamp(row.getValue("timestamp")),
    enableHiding: false, // Timestamp mungkin penting untuk selalu terlihat
  },
  {
    accessorKey: "water_level_cm",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ketinggian Air (cm)" />
    ),
    cell: ({ row }) => {
      const value = parseFloat(row.getValue("water_level_cm"));
      return isNaN(value) ? "N/A" : value.toFixed(2);
    },
  },
  {
    accessorKey: "temperature_c",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Suhu (°C)" />
    ),
    cell: ({ row }) => {
      const value = parseFloat(row.getValue("temperature_c"));
      return isNaN(value) ? "N/A" : value.toFixed(1);
    },
  },
  // {
  //   accessorKey: "ph_value",
  //   header: ({ column }) => (
  //     <DataTableColumnHeader column={column} title="pH" />
  //   ),
  //   cell: ({ row }) => {
  //     const value = parseFloat(row.getValue("ph_value"));
  //     return isNaN(value) ? "N/A" : value.toFixed(1);
  //   },
  // },
  {
    accessorKey: "turbidity_ntu",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Kekeruhan (NTU)" />
    ),
    cell: ({ row }) => {
      const value = parseFloat(row.getValue("turbidity_ntu"));
      return isNaN(value) ? "N/A" : value.toFixed(1);
    },
  },
  {
    accessorKey: "tds_ppm",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="TDS (ppm)" />
    ),
    cell: ({ row }) => {
      const value = parseFloat(row.getValue("tds_ppm"));
      return isNaN(value) ? "N/A" : value.toFixed(0);
    },
  },
  {
    accessorKey: "rainfall_value_raw", // Sesuaikan key ini jika berbeda di tipe SensorData Anda
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Curah Hujan (Raw)" />
    ),
    cell: ({ row }) => {
      const value = row.getValue("rainfall_value_raw");
      return value === null || value === undefined ? "N/A" : String(value);
    },
  },
  // Anda bisa menambahkan kolom lain dari tipe SensorData jika relevan
];
