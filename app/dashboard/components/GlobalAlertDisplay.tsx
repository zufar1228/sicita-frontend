// app/dashboard/components/GlobalAlertDisplay.tsx
"use client";

import React, { useMemo } from "react";
import { Device } from "@/types/device"; // Opsional, jika ingin menampilkan nama/lokasi perangkat
import { CriticalWaterQualityAlertData } from "@/types/sensor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react"; // Atau ikon lain yang sesuai

type ActiveCriticalWaterQualityAlertsMap = Record<
  string,
  CriticalWaterQualityAlertData | null
>;

interface GlobalAlertDisplayProps {
  activeCriticalWaterQualityAlerts: ActiveCriticalWaterQualityAlertsMap;
  devices?: Device[]; // Jadikan opsional, untuk mengambil nama/lokasi perangkat
}

interface FormattedAlert {
  deviceId: string;
  deviceName?: string; // Nama perangkat jika tersedia
  message: string;
  details?: string; // Detail spesifik dari alert (misal, parameter apa yang kritis)
  timestamp: string;
}

export default function GlobalAlertDisplay({
  activeCriticalWaterQualityAlerts,
  devices,
}: GlobalAlertDisplayProps) {
  const formattedAlerts = useMemo(() => {
    return Object.entries(activeCriticalWaterQualityAlerts)
      .filter(([alertData]) => alertData !== null)
      .map(([deviceId, alertData]) => {
        if (!alertData) return null; // Seharusnya tidak terjadi karena filter di atas

        const device = devices?.find((d) => d.device_id === deviceId);

        // Coba parsing pesan untuk detail yang lebih baik (ini masih idealnya dari backend)
        let mainMessage = "Kualitas Air Kritis Terdeteksi!";
        const alertDetails = `Parameter ${
          alertData.critical_parameter || "tidak diketahui"
        } mencapai level berbahaya.`;

        // Contoh parsing sederhana dari pesan yang ada di DeviceStatusCard sebelumnya
        // Anda bisa membuat ini lebih canggih atau idealnya mendapatkan field terpisah dari backend
        const messageParts = alertData.message.split("!!!");
        if (messageParts.length > 1) {
          const detailPart = messageParts[1].split(":");
          if (detailPart.length > 1) mainMessage = detailPart[1].trim();
          else mainMessage = messageParts[1].trim();
        } else {
          mainMessage = alertData.message; // Gunakan pesan asli jika tidak ada format "!!!"
        }

        return {
          deviceId: deviceId,
          deviceName: device?.name || deviceId,
          message: mainMessage,
          details: alertDetails,
          timestamp: alertData.timestamp,
        };
      })
      .filter(Boolean) as FormattedAlert[]; // Filter null dan pastikan tipenya benar
  }, [activeCriticalWaterQualityAlerts, devices]);

  if (formattedAlerts.length === 0) {
    return null; // Jangan render apapun jika tidak ada alert global
  }

  return (
    <div className="mb-6 space-y-3">
      {formattedAlerts.map((alert) => (
        <Alert
          key={alert.deviceId}
          variant="destructive"
          className="border-purple-500/50 dark:border-purple-500/70 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
        >
          <ShieldAlert className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <AlertTitle className="font-semibold text-purple-800 dark:text-purple-200">
            Peringatan Kritis Kualitas Air: {alert.deviceName}
          </AlertTitle>
          <AlertDescription className="text-xs">
            <p className="font-medium">{alert.message}</p>
            {alert.details && <p className="opacity-90">{alert.details}</p>}
            <p className="text-xs opacity-70 mt-1">
              Terdeteksi pada:{" "}
              {new Date(alert.timestamp).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </AlertDescription>
        </Alert>
      ))}
      {/* Jika Anda ingin satu Alert besar untuk semua, logikanya akan sedikit berbeda:
      <Alert variant="destructive">
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle>Peringatan Kritis Sistem!</AlertTitle>
        <AlertDescription>
          Beberapa perangkat melaporkan kualitas air kritis:
          <ul className="list-disc pl-5 mt-1 text-xs">
            {formattedAlerts.map(alert => (
              <li key={alert.deviceId}>
                <strong>{alert.deviceName}:</strong> {alert.message} ({new Date(alert.timestamp).toLocaleTimeString("id-ID")})
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
      */}
    </div>
  );
}
