// app/dashboard/history/[deviceId]/alert-columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

// Definisikan tipe data untuk sebuah alert, sesuaikan dengan respons API Anda
export interface AlertData {
  id: number;
  device_id: string;
  alert_type: "flood" | "rapid_rise" | "critical_water_quality";
  message: string;
  severity: "warning" | "critical";
  is_active: boolean;
  alert_triggered_at: string;
  resolved_at: string | null;
  // Anda bisa tambahkan device_name, dll jika API mengirimkannya
}

const formatTimestamp = (timestamp: string | null | undefined): string => {
  if (!timestamp) return "N/A";
  return new Date(timestamp).toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const columns: ColumnDef<AlertData>[] = [
  {
    accessorKey: "alert_triggered_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Waktu Pemicu" />
    ),
    cell: ({ row }) => formatTimestamp(row.getValue("alert_triggered_at")),
  },
  {
    accessorKey: "alert_type",
    header: "Tipe Alert",
    cell: ({ row }) => {
      const type = row.getValue("alert_type") as string;
      const typeMap: Record<string, string> = {
        flood: "Banjir",
        rapid_rise: "Kenaikan Cepat",
        critical_water_quality: "Kualitas Air Kritis",
      };
      return <Badge variant="outline">{typeMap[type] || type}</Badge>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "severity",
    header: "Level",
    cell: ({ row }) => {
      const severity = row.getValue("severity") as string;
      return (
        <Badge
          variant={severity === "critical" ? "destructive" : "default"}
          className={severity === "warning" ? "bg-yellow-500" : ""}
        >
          {severity.charAt(0).toUpperCase() + severity.slice(1)}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "message",
    header: "Pesan",
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate" title={row.getValue("message")}>
        {row.getValue("message")}
      </div>
    ),
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active");
      return isActive ? (
        <span className="flex items-center text-destructive">
          <AlertTriangle className="mr-2 h-4 w-4" /> Aktif
        </span>
      ) : (
        <span className="flex items-center text-green-600">
          <CheckCircle2 className="mr-2 h-4 w-4" /> Selesai
        </span>
      );
    },
    filterFn: (row, id, value) => {
      // Custom filter function to handle boolean as string 'true'/'false'
      return String(row.getValue(id)) === String(value);
    },
  },
  {
    accessorKey: "resolved_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Waktu Selesai" />
    ),
    cell: ({ row }) => formatTimestamp(row.getValue("resolved_at")),
  },
];
