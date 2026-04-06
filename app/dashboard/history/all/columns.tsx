"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

// Tipe data ini sedikit berbeda dari sebelumnya, karena ada device_name
export interface AlertHistoryData {
  id: number;
  device_id: string;
  device_name: string | null; // <-- Kolom baru
  alert_type: "flood" | "rapid_rise" | "critical_water_quality";
  message: string;
  severity: "warning" | "critical";
  is_active: boolean;
  alert_triggered_at: string;
  resolved_at: string | null;
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

export const columns: ColumnDef<AlertHistoryData>[] = [
  {
    accessorKey: "alert_triggered_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Waktu Kejadian" />
    ),
    cell: ({ row }) => formatTimestamp(row.getValue("alert_triggered_at")),
  },
  {
    accessorKey: "device_id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID Perangkat" />
    ),
    cell: ({ row }) => {
      const deviceId = row.getValue("device_id") as string;
      const deviceName = row.original.device_name;
      return (
        <Link
          href={`/dashboard/device/${deviceId}`}
          className="hover:underline text-blue-600 dark:text-blue-400 font-medium"
          title={deviceName || `Lihat detail untuk ${deviceId}`}
        >
          {deviceId}
        </Link>
      );
    },
  },
  //   {
  //     accessorKey: "device_name",
  //     header: ({ column }) => (
  //       <DataTableColumnHeader column={column} title="Nama Perangkat" />
  //     ),
  //     cell: ({ row }) =>
  //       row.getValue("device_name") || (
  //         <span className="text-muted-foreground italic">Tanpa Nama</span>
  //       ),
  //   },
  {
    accessorKey: "alert_type",
    header: "Tipe Alert",
    cell: ({ row }) => {
      const type = row.getValue("alert_type") as string;
      const typeMap: Record<string, string> = {
        flood: "Banjir",
        rapid_rise: "Kenaikan Cepat",
        critical_water_quality: "Kualitas Air",
      };
      return <Badge variant="outline">{typeMap[type] || type}</Badge>;
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
          className={
            severity === "warning" ? "bg-yellow-500 hover:bg-yellow-600" : ""
          }
        >
          {severity.charAt(0).toUpperCase() + severity.slice(1)}
        </Badge>
      );
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
        <span className="flex items-center font-semibold text-destructive">
          <AlertTriangle className="mr-2 h-4 w-4" /> Aktif
        </span>
      ) : (
        <span className="flex items-center text-green-600">
          <CheckCircle2 className="mr-2 h-4 w-4" /> Selesai
        </span>
      );
    },
  },
];
