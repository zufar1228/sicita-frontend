// app/dashboard/components/DashboardStatsCards.tsx
"use client";

import React, { useMemo } from "react";
import { Device } from "@/types/device";
import { FloodAlertData, CriticalWaterQualityAlertData } from "@/types/sensor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, // Untuk Total Perangkat
  Wifi, // Untuk Online
  WifiOff, // Untuk Offline
  ShieldAlert, // Untuk Alert Banjir
  FlaskConical, // Untuk Alert Kualitas Air (atau ikon lain yang sesuai)
} from "lucide-react";

// Tipe untuk props, sesuaikan jika perlu
type ActiveAlertsMap = Record<string, FloodAlertData | null>;
type ActiveCriticalWaterQualityAlertsMap = Record<
  string,
  CriticalWaterQualityAlertData | null
>;

interface DashboardStatsCardsProps {
  devices: Device[];
  activeAlerts: ActiveAlertsMap;
  activeCriticalWaterQualityAlerts: ActiveCriticalWaterQualityAlertsMap;
}

interface StatCardItem {
  title: string;
  value: number | string;
  icon: React.ElementType;
  iconColor?: string;
  description?: string;
}

export default function DashboardStatsCards({
  devices,
  activeAlerts,
  activeCriticalWaterQualityAlerts,
}: DashboardStatsCardsProps) {
  // Gunakan useMemo untuk menghitung statistik agar tidak dihitung ulang pada setiap render
  // kecuali jika dependensinya (props) berubah.
  const stats: StatCardItem[] = useMemo(() => {
    const totalDevices = devices.length;
    const onlineDevices = devices.filter((device) => !device.is_offline).length;
    const offlineDevices = devices.filter((device) => device.is_offline).length;

    const currentFloodAlertsCount = Object.values(activeAlerts).filter(
      (alert) => alert !== null
    ).length;

    const currentCriticalWQAlertsCount = Object.values(
      activeCriticalWaterQualityAlerts
    ).filter((alert) => alert !== null).length;

    return [
      {
        title: "Total Perangkat",
        value: totalDevices,
        icon: Users,
        iconColor: "text-blue-500 dark:text-blue-400",
        description: "Jumlah semua perangkat terdaftar.",
      },
      {
        title: "Perangkat Online",
        value: onlineDevices,
        icon: Wifi,
        iconColor: "text-green-500 dark:text-green-400",
        description: "Perangkat yang aktif dan terhubung.",
      },
      {
        title: "Perangkat Offline",
        value: offlineDevices,
        icon: WifiOff,
        iconColor: "text-slate-500 dark:text-slate-400",
        description: "Perangkat yang tidak terhubung.",
      },
      {
        title: "Alert Banjir",
        value: currentFloodAlertsCount,
        icon: ShieldAlert,
        iconColor:
          currentFloodAlertsCount > 0
            ? "text-red-500 dark:text-red-400"
            : "text-gray-500 dark:text-gray-400",
        description: "Jumlah alert level banjir aktif.",
      },
      {
        title: "Kualitas Air Kritis",
        value: currentCriticalWQAlertsCount,
        icon: FlaskConical, // Ganti ikon jika perlu
        iconColor:
          currentCriticalWQAlertsCount > 0
            ? "text-purple-500 dark:text-purple-400"
            : "text-gray-500 dark:text-gray-400",
        description: "Jumlah alert kualitas air kritis.",
      },
    ];
  }, [devices, activeAlerts, activeCriticalWaterQualityAlerts]);

  if (!devices) {
    // Bisa tambahkan skeleton loading jika devices belum ada
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-6">
      {stats.map((stat) => (
        <Card
          key={stat.title}
          className="shadow hover:shadow-lg transition-shadow"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon
              className={`h-5 w-5 ${stat.iconColor || "text-muted-foreground"}`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.description && (
              <p className="text-xs text-muted-foreground pt-1">
                {stat.description}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
