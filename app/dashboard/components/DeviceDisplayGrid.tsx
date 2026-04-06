// app/dashboard/components/DeviceDisplayGrid.tsx
"use client";

import { Device } from "@/types/device";
import {
  SensorData,
  FloodAlertData,
  RapidRiseAlertData,
  WaterQualityUpdateData,
  CriticalWaterQualityAlertData,
  RainfallUpdateData, // Asumsi tipe ini sudah ada dan diekspor dari types/sensor.ts
} from "@/types/sensor";
import DeviceStatusCard from "@/components/DeviceStatusCard"; // Pastikan path ini benar

// Tipe untuk props, bisa diimpor jika sudah ada secara global
type RealtimeDataMap = Record<string, Partial<SensorData>>;
type ActiveAlertsMap = Record<string, FloodAlertData | null>;
type ActiveRapidRiseAlertsMap = Record<string, RapidRiseAlertData | null>;
type RainfallStatusMap = Record<string, RainfallUpdateData | null>; // Menggunakan RainfallUpdateData
type WaterQualityStatusMap = Record<string, WaterQualityUpdateData | null>;
type ActiveCriticalWaterQualityAlertsMap = Record<
  string,
  CriticalWaterQualityAlertData | null
>;

interface DeviceDisplayGridProps {
  devices: Device[];
  realtimeData: RealtimeDataMap;
  activeAlerts: ActiveAlertsMap;
  activeRapidRiseAlerts: ActiveRapidRiseAlertsMap;
  rainfallStatuses: RainfallStatusMap;
  waterQualityStatuses: WaterQualityStatusMap;
  activeCriticalWaterQualityAlerts: ActiveCriticalWaterQualityAlertsMap;
  // isLoading dan error bisa dipertimbangkan untuk dihapus jika AllDevicesDashboardPage sudah menanganinya
  // isLoading: boolean;
  // error?: string | null;
}

export default function DeviceDisplayGrid({
  devices,
  realtimeData,
  activeAlerts,
  activeRapidRiseAlerts,
  waterQualityStatuses,
  activeCriticalWaterQualityAlerts,
}: // isLoading,
// error,
DeviceDisplayGridProps) {
  // Jika isLoading dan error ditangani oleh parent, bagian ini bisa dihapus:
  // if (isLoading) {
  //   return <p className="text-center py-8 text-muted-foreground">Memuat daftar perangkat...</p>;
  // }
  // if (error) {
  //   return (
  //     <div className="text-center py-8">
  //       <p className="text-red-600 font-medium">Error Memuat Perangkat</p>
  //       <p className="text-muted-foreground">{error}</p>
  //     </div>
  //   );
  // }

  if (!devices || devices.length === 0) {
    // Pesan ini akan ditampilkan jika parent sudah selesai loading dan tidak ada error,
    // namun array devices memang kosong.
    return (
      <p className="text-center text-muted-foreground py-10">
        Belum ada perangkat yang terdaftar atau dapat diakses.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {" "}
      {/* Sedikit penyesuaian pada gap dan sm:grid-cols-2 */}
      {devices.map((device) => {
        // Ambil data spesifik untuk perangkat ini
        const currentData = realtimeData[device.device_id];
        const currentFloodAlert = activeAlerts[device.device_id];
        const currentRapidRiseAlert = activeRapidRiseAlerts[device.device_id];
        const currentWaterQuality = waterQualityStatuses[device.device_id];
        const currentCriticalWaterQuality =
          activeCriticalWaterQualityAlerts[device.device_id];

        return (
          <DeviceStatusCard
            key={device.device_id}
            device={device}
            latestData={currentData}
            floodAlert={currentFloodAlert}
            rapidRiseAlert={currentRapidRiseAlert}
            waterQualityStatus={currentWaterQuality} // Ganti nama prop jika perlu
            criticalWaterQualityAlert={currentCriticalWaterQuality}
          />
        );
      })}
    </div>
  );
}
