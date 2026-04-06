// app/components/DeviceStatusCard.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import { getBackendUrl } from "@/lib/demo/utils";
import { Device } from "@/types/device";
import {
  SensorData,
  FloodAlertData,
  RapidRiseAlertData,
  WaterQualityUpdateData,
  CriticalWaterQualityAlertData,
  RainfallUpdateData,
  DeviceStatusUpdateData,
} from "@/types/sensor";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Droplet,
  CloudRain,
  Thermometer,
  Zap,
  ShieldAlert,
  ShieldCheckIcon,
  TestTube2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { Socket } from "socket.io-client";

// ▼▼▼ LANGKAH 1: Tambahkan konstanta dan fungsi baru ini ▼▼▼
const RAINFALL_THRESHOLD_NO_RAIN_MAX = 50;
const RAINFALL_THRESHOLD_LIGHT_RAIN_MAX = 1000;
const RAINFALL_THRESHOLD_MODERATE_RAIN_MAX = 2500;

const getDisplayRainfallCategory = (
  rawValue: number | null | undefined
): string => {
  if (rawValue === null || rawValue === undefined) {
    return "Tidak Ada Data";
  }
  if (rawValue <= RAINFALL_THRESHOLD_NO_RAIN_MAX) {
    return "Tidak Hujan";
  } else if (rawValue <= RAINFALL_THRESHOLD_LIGHT_RAIN_MAX) {
    return "Hujan Ringan";
  } else if (rawValue <= RAINFALL_THRESHOLD_MODERATE_RAIN_MAX) {
    return "Hujan Sedang";
  } else {
    return "Hujan Lebat";
  }
};

const formatSensorValue = (
  value: number | string | null | undefined,
  unit: string = "",
  precision?: number
): string => {
  if (value === null || value === undefined) return "---";
  if (typeof value === "number" && precision !== undefined) {
    if (isNaN(value) || !isFinite(value)) return "---";
    return `${value.toFixed(precision)}${unit}`;
  }
  if (typeof value === "string") {
    const numValue = Number(value);
    if (!isNaN(numValue) && isFinite(numValue) && precision !== undefined) {
      return `${numValue.toFixed(precision)}${unit}`;
    }
  }
  return `${value}${unit}`;
};

const processSensorValue = (
  value: string | number | boolean | null | undefined
): number | null => {
  if (value === null || value === undefined || String(value).trim() === "")
    return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
};

const processSensorDataForCard = (
  rawData:
    | Record<string, string | number | boolean | null | undefined>
    | SensorData
    | Partial<SensorData>
    | null
): Partial<SensorData> => {
  if (!rawData) return {};
  return {
    device_id: rawData.device_id ? String(rawData.device_id) : undefined,
    timestamp: rawData.timestamp ? String(rawData.timestamp) : undefined,
    water_level_cm: processSensorValue(rawData.water_level_cm),
    raw_distance_cm: processSensorValue(rawData.raw_distance_cm),
    temperature_c: processSensorValue(rawData.temperature_c),
    ph_value: processSensorValue(rawData.ph_value),
    turbidity_ntu: processSensorValue(rawData.turbidity_ntu),
    tds_ppm: processSensorValue(rawData.tds_ppm),
    rainfall_value_raw: processSensorValue(rawData.rainfall_value_raw),
    rainfall_category: rawData.rainfall_category
      ? String(rawData.rainfall_category)
      : undefined,
    water_quality_category: rawData.water_quality_category
      ? String(rawData.water_quality_category)
      : undefined,
  };
};

interface DeviceStatusCardProps {
  device: Device;
  latestData?: SensorData | Partial<SensorData> | null;
  floodAlert?: FloodAlertData | null;
  rapidRiseAlert?: RapidRiseAlertData | null;
  waterQualityStatus?: WaterQualityUpdateData | null;
  criticalWaterQualityAlert?: CriticalWaterQualityAlertData | null;
  displayRainfallCategory?: string; // Prop opsional dari parent
}

interface CardSocketEvents {
  new_sensor_data: (data: SensorData) => void;
  flood_alert: (data: FloodAlertData) => void;
  rapid_rise_alert: (data: RapidRiseAlertData) => void;
  rainfall_update: (data: RainfallUpdateData) => void;
  water_quality_update: (data: WaterQualityUpdateData) => void;
  critical_water_quality_alert: (data: CriticalWaterQualityAlertData) => void;
  device_status_update: (data: DeviceStatusUpdateData) => void;
  alert_resolved?: (data: { deviceId: string; alertType: string }) => void;
}

export default function DeviceStatusCard({
  device,
  latestData: initialLatestData,
  floodAlert: initialFloodAlert,
  rapidRiseAlert: initialRapidRiseAlert,
  waterQualityStatus: initialWaterQualityStatus,
  criticalWaterQualityAlert: initialCriticalWQAlert,
  displayRainfallCategory: rainfallCategoryFromProp,
}: DeviceStatusCardProps) {
  const { data: session } = useSession();

  const [currentDevice, setCurrentDevice] = useState<Device>(device);
  const [latestData, setLatestData] = useState<Partial<SensorData> | null>(
    initialLatestData || null
  );
  const [rainfallStatus, setRainfallStatus] =
    useState<RainfallUpdateData | null>(null);
  const [waterQualityStatus, setWaterQualityStatus] =
    useState<WaterQualityUpdateData | null>(initialWaterQualityStatus || null);
  const [floodAlert, setFloodAlert] = useState<FloodAlertData | null>(
    initialFloodAlert || null
  );
  const [rapidRiseAlert, setRapidRiseAlert] =
    useState<RapidRiseAlertData | null>(initialRapidRiseAlert || null);
  const [criticalWaterQualityAlert, setCriticalWaterQualityAlert] =
    useState<CriticalWaterQualityAlertData | null>(
      initialCriticalWQAlert || null
    );

  const [isLoading, setIsLoading] = useState<boolean>(!initialLatestData);
  const [error, setError] = useState<string | null>(null);

  const backendUrl = getBackendUrl();

  const fetchData = useCallback(async () => {
    if (
      !session?.user?.backendToken ||
      !backendUrl ||
      !currentDevice.device_id
    ) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${backendUrl}/api/devices/${currentDevice.device_id}/latest-reading`,
        {
          headers: {
            Authorization: `Bearer ${session.user.backendToken}`,
          },
        }
      );
      if (!response.ok) {
        if (response.status === 404) {
          setLatestData(null);
          setRainfallStatus(null);
          setWaterQualityStatus(null);
        } else {
          throw new Error(`Gagal mengambil data: ${response.status}`);
        }
      } else {
        const rawData: Record<string, string | number | boolean | null> | null =
          await response.json();
        if (rawData) {
          const processedData = processSensorDataForCard(rawData);
          setLatestData(processedData);

          if (
            processedData.rainfall_value_raw !== null &&
            processedData.rainfall_value_raw !== undefined
          ) {
            setRainfallStatus({
              deviceId: currentDevice.device_id,
              rainfall_raw_value: processedData.rainfall_value_raw,
              rainfall_category:
                processedData.rainfall_category || "Memproses...",
              timestamp: processedData.timestamp!,
            });
          } else {
            setRainfallStatus(null);
          }

          if (
            processedData.ph_value !== null ||
            processedData.turbidity_ntu !== null ||
            processedData.tds_ppm !== null
          ) {
            setWaterQualityStatus({
              deviceId: currentDevice.device_id,
              ph_value: processedData.ph_value ?? null,
              turbidity_ntu: processedData.turbidity_ntu ?? null,
              tds_ppm: processedData.tds_ppm ?? null,
              qualityCategory:
                processedData.water_quality_category || "Memproses...",
              timestamp: processedData.timestamp!,
            });
          } else {
            setWaterQualityStatus(null);
          }
        } else {
          setLatestData(null);
          setRainfallStatus(null);
          setWaterQualityStatus(null);
        }
      }
    } catch (err) {
      console.error(
        `Error fetching latest reading for ${currentDevice.device_id}:`,
        err
      );
      setError(err instanceof Error ? err.message : "Gagal memuat data.");
      setLatestData(null);
      setRainfallStatus(null);
      setWaterQualityStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentDevice.device_id, session?.user?.backendToken, backendUrl]);

  useEffect(() => {
    // Hanya fetch data jika tidak ada data awal dari props
    if (!initialLatestData) {
      fetchData();
    }
  }, [fetchData, initialLatestData]);

  // Listener WebSocket (Tidak berubah)
  useEffect(() => {
    if (!session?.user?.backendToken || !backendUrl || !currentDevice.device_id)
      return;

    const socket: Socket<CardSocketEvents> = getSocket(
      backendUrl,
      session.user.backendToken
    );
    if (!socket.connected) socket.connect();

    const handleNewSensorData = (rawData: SensorData) => {
      if (rawData.device_id === currentDevice.device_id) {
        setLatestData(processSensorDataForCard(rawData));
      }
    };
    const handleRainfallUpdate = (data: RainfallUpdateData) => {
      if (data.deviceId === currentDevice.device_id) setRainfallStatus(data);
    };
    const handleWaterQualityUpdate = (data: WaterQualityUpdateData) => {
      if (data.deviceId === currentDevice.device_id)
        setWaterQualityStatus(data);
    };
    const handleFloodAlert = (data: FloodAlertData) => {
      if (data.deviceId === currentDevice.device_id)
        setFloodAlert(data.isActive ? data : null);
    };
    const handleRapidRiseAlert = (data: RapidRiseAlertData) => {
      if (data.deviceId === currentDevice.device_id)
        setRapidRiseAlert(data.isActive ? data : null);
    };
    const handleCriticalWQAlert = (data: CriticalWaterQualityAlertData) => {
      if (data.deviceId === currentDevice.device_id)
        setCriticalWaterQualityAlert(data.isActive ? data : null);
    };
    const handleDeviceStatusUpdate = (data: DeviceStatusUpdateData) => {
      if (data.deviceId === currentDevice.device_id) {
        setCurrentDevice((prev) => ({
          ...prev,
          is_offline: data.is_offline,
          last_seen_at: data.last_seen_at ?? prev.last_seen_at,
        }));
      }
    };
    const handleAlertResolved = (data: {
      deviceId: string;
      alertType: string;
    }) => {
      if (data.deviceId === currentDevice.device_id) {
        if (data.alertType === "flood") setFloodAlert(null);
        if (data.alertType === "rapid_rise") setRapidRiseAlert(null);
        if (data.alertType === "critical_water_quality")
          setCriticalWaterQualityAlert(null);
      }
    };

    socket.on("new_sensor_data", handleNewSensorData);
    socket.on("rainfall_update", handleRainfallUpdate);
    socket.on("water_quality_update", handleWaterQualityUpdate);
    socket.on("flood_alert", handleFloodAlert);
    socket.on("rapid_rise_alert", handleRapidRiseAlert);
    socket.on("critical_water_quality_alert", handleCriticalWQAlert);
    socket.on("device_status_update", handleDeviceStatusUpdate);
    if (socket.listeners("alert_resolved").length === 0) {
      socket.on("alert_resolved", handleAlertResolved);
    }

    return () => {
      socket.off("new_sensor_data", handleNewSensorData);
      socket.off("rainfall_update", handleRainfallUpdate);
      socket.off("water_quality_update", handleWaterQualityUpdate);
      socket.off("flood_alert", handleFloodAlert);
      socket.off("rapid_rise_alert", handleRapidRiseAlert);
      socket.off("critical_water_quality_alert", handleCriticalWQAlert);
      socket.off("device_status_update", handleDeviceStatusUpdate);
      socket.off("alert_resolved", handleAlertResolved);
    };
  }, [currentDevice.device_id, session?.user?.backendToken, backendUrl]);

  // Logika visual kartu (tidak berubah)
  let cardBorderColor = "border-border";
  let cardBgColor = "bg-card";
  const statusBadges: React.ReactNode[] = [];
  let mainIcon: React.ReactNode = (
    <ShieldCheckIcon className="h-4 w-4 text-green-500" />
  );

  const getQualityBadgeClass = (category?: string): string => {
    switch (category) {
      case "Baik":
        return "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200 border-green-500";
      case "Sedang":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200 border-yellow-500";
      case "Buruk":
        return "bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-200 border-orange-500";
      case "Kritis":
        return "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200 border-red-500";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 border-gray-500";
    }
  };

  if (currentDevice.is_offline) {
    cardBorderColor =
      "border-slate-400 dark:border-slate-600 ring-1 ring-slate-400 dark:ring-slate-600";
    cardBgColor = "bg-slate-100 dark:bg-slate-900 opacity-75";
    statusBadges.push(
      <Badge
        key="offline"
        variant="secondary"
        className="text-xs bg-slate-500 text-white border-slate-500"
      >
        <Zap className="mr-1 h-3 w-3" /> OFFLINE
      </Badge>
    );
    mainIcon = <Zap className="h-4 w-4 text-slate-500" />;
  } else {
    if (criticalWaterQualityAlert?.isActive) {
      cardBorderColor =
        "border-purple-500 dark:border-purple-400 ring-2 ring-purple-500 dark:ring-purple-400";
      cardBgColor = "bg-purple-50 dark:bg-purple-950/30";
      statusBadges.push(
        <Badge
          key="wq_critical"
          variant="destructive"
          className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
        >
          <ShieldAlert className="mr-1 h-3 w-3" /> KUALITAS KRITIS!
        </Badge>
      );
      mainIcon = <ShieldAlert className="h-4 w-4 text-purple-600" />;
    } else if (floodAlert?.isActive) {
      cardBorderColor =
        "border-red-500 dark:border-red-400 ring-2 ring-red-500 dark:ring-red-400";
      cardBgColor = "bg-red-50 dark:bg-red-950/30";
      statusBadges.push(
        <Badge
          key="flood_alert"
          variant="destructive"
          className="bg-red-600 hover:bg-red-700 text-white border-red-600"
        >
          <AlertTriangle className="mr-1 h-3 w-3" /> ALERT BANJIR!
        </Badge>
      );
      mainIcon = <AlertTriangle className="h-4 w-4 text-red-600" />;
    } else if (rapidRiseAlert?.isActive) {
      cardBorderColor =
        "border-orange-500 dark:border-orange-400 ring-2 ring-orange-500 dark:ring-orange-400";
      cardBgColor = "bg-orange-50 dark:bg-orange-950/30";
      statusBadges.push(
        <Badge
          key="rapid_rise"
          variant="default"
          className="text-xs bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
        >
          <AlertTriangle className="mr-1 h-3 w-3" /> NAIK CEPAT!
        </Badge>
      );
      mainIcon = <AlertTriangle className="h-4 w-4 text-orange-500" />;
    } else if (
      waterQualityStatus?.qualityCategory === "Buruk" ||
      waterQualityStatus?.qualityCategory === "Kritis"
    ) {
      statusBadges.push(
        <Badge
          key="wq_warning"
          variant="outline"
          className={`text-xs ${getQualityBadgeClass(
            waterQualityStatus.qualityCategory
          )}`}
        >
          Kualitas Air: {waterQualityStatus.qualityCategory}
        </Badge>
      );
    }

    if (statusBadges.length === 0) {
      statusBadges.push(
        <Badge
          key="online"
          variant="default"
          className="text-xs bg-green-600 hover:bg-green-700 text-white border-green-600"
        >
          <ShieldCheckIcon className="mr-1 h-3 w-3" /> ONLINE
        </Badge>
      );
    }
  }

  const parseAlertMessageDetail = (
    message?: string,
    defaultMessage?: string
  ): string => {
    if (!message) return defaultMessage || "Informasi tidak tersedia.";
    const parts = message.split("!!!");
    if (parts.length > 1) {
      const detailPart = parts[1].split(":");
      if (detailPart.length > 1) return detailPart[1].trim();
      return parts[1].trim();
    }
    return message;
  };

  const displayTimestamp =
    latestData?.timestamp ||
    rainfallStatus?.timestamp ||
    waterQualityStatus?.timestamp
      ? new Date(
          latestData?.timestamp ||
            rainfallStatus!.timestamp ||
            waterQualityStatus!.timestamp
        ).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "Menunggu data...";

  if (isLoading && !latestData && !error) {
    // Tampilan loading (tidak berubah)
    return (
      <Card
        className={`shadow-lg rounded-lg overflow-hidden ${cardBorderColor} ${cardBgColor}`}
      >
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-base font-semibold truncate flex items-center">
              {mainIcon}
              <span className="ml-2 ">
                {currentDevice.name || currentDevice.device_id}
              </span>
            </CardTitle>
            <div className="flex flex-col items-end space-y-1 flex-shrink-0">
              {statusBadges}
            </div>
          </div>
          <CardDescription className="text-xs truncate pt-1">
            {currentDevice.location || "Lokasi tidak diatur"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm px-4 pb-3 flex flex-col items-center justify-center h-[150px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Memuat data sensor...</p>
        </CardContent>
        <CardFooter className="flex justify-between items-center pt-3 pb-3 px-4 border-t border-border/50">
          <div className="text-xs text-muted-foreground">Memuat...</div>
          <Button variant="ghost" size="sm" className="text-xs" disabled>
            Lihat Detail
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (error && !latestData) {
    // Tampilan error (tidak berubah)
    return (
      <Card
        className={`shadow-lg rounded-lg overflow-hidden border-destructive ${cardBgColor}`}
      >
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-base font-semibold truncate flex items-center">
            <AlertTriangle className="h-4 w-4 text-destructive mr-2" />
            <span className="ml-2 ">
              {currentDevice.name || currentDevice.device_id}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-xs text-destructive py-4">
          Gagal memuat data sensor.{" "}
          <Button
            variant="link"
            size="sm"
            onClick={fetchData}
            className="p-0 h-auto text-xs"
          >
            Coba lagi
          </Button>
        </CardContent>
        <CardFooter className="pt-3 pb-3 px-4 border-t ">
          <span className="text-xs text-muted-foreground">Error</span>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card
      className={`shadow-lg transition-all hover:shadow-xl rounded-lg overflow-hidden ${cardBorderColor} ${cardBgColor}`}
    >
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-base font-semibold truncate flex items-center">
            {mainIcon}
            <span className="ml-2 ">
              {currentDevice.name || currentDevice.device_id}
            </span>
          </CardTitle>
          <div className="flex flex-col items-end space-y-1 flex-shrink-0">
            {statusBadges}
          </div>
        </div>
        <CardDescription className="text-xs truncate pt-1">
          {currentDevice.location || "Lokasi tidak diatur"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm px-4 pb-3">
        <div className="flex items-center">
          <Droplet className="h-4 w-4 mr-2 text-blue-500" />
          <strong>Ketinggian Air:</strong>
          <span className="ml-auto font-medium">
            {formatSensorValue(latestData?.water_level_cm, " cm", 1)}
          </span>
        </div>
        <div className="flex items-center">
          <Thermometer className="h-4 w-4 mr-2 text-red-500" />
          <strong>Suhu:</strong>
          <span className="ml-auto font-medium">
            {formatSensorValue(latestData?.temperature_c, " °C", 1)}
          </span>
        </div>
        <div className="flex items-center">
          <CloudRain className="h-4 w-4 mr-2 text-sky-500" />
          <strong>Curah Hujan:</strong>
          <span className="ml-auto font-medium">
            {/* ▼▼▼ LANGKAH 2: Terapkan fungsi baru di sini ▼▼▼ */}
            {rainfallCategoryFromProp ??
              getDisplayRainfallCategory(
                rainfallStatus?.rainfall_raw_value ??
                  latestData?.rainfall_value_raw
              )}
            {(rainfallStatus?.rainfall_raw_value !== null &&
              rainfallStatus?.rainfall_raw_value !== undefined) ||
            (latestData?.rainfall_value_raw !== null &&
              latestData?.rainfall_value_raw !== undefined)
              ? ` (${formatSensorValue(
                  rainfallStatus?.rainfall_raw_value ??
                    latestData?.rainfall_value_raw
                )})`
              : ""}
          </span>
        </div>

        {waterQualityStatus ||
        (latestData &&
          (latestData.ph_value !== null ||
            latestData.turbidity_ntu !== null ||
            latestData.tds_ppm !== null)) ? (
          <div className="pt-2 mt-2 border-t border-border/50">
            <div className="flex items-center justify-between mb-1">
              <p className="font-medium flex items-center">
                <TestTube2 className="h-4 w-4 mr-2 text-indigo-500" />
                Kualitas Air:
              </p>
              {/* ▼▼▼ LANGKAH 3: Badge Kualitas Air telah dihapus dari sini ▼▼▼ */}
            </div>
            <ul className="text-xs text-muted-foreground space-y-0.5 pl-6">
              <li className="flex justify-between">
                <span>pH:</span>
                <span className="font-medium">
                  {formatSensorValue(
                    waterQualityStatus?.ph_value ?? latestData?.ph_value,
                    "",
                    1
                  )}
                </span>
              </li>
              <li className="flex justify-between">
                <span>Kekeruhan:</span>
                <span className="font-medium">
                  {formatSensorValue(
                    waterQualityStatus?.turbidity_ntu ??
                      latestData?.turbidity_ntu,
                    " NTU",
                    1
                  )}
                </span>
              </li>
              <li className="flex justify-between">
                <span>TDS:</span>
                <span className="font-medium">
                  {formatSensorValue(
                    waterQualityStatus?.tds_ppm ?? latestData?.tds_ppm,
                    " ppm",
                    0
                  )}
                </span>
              </li>
            </ul>
          </div>
        ) : (
          <div className="pt-2 mt-2 border-t border-border/50">
            <div className="flex items-center">
              <TestTube2 className="h-4 w-4 mr-2 text-gray-400" />
              <strong>Kualitas Air:</strong>
              <span className="ml-auto font-medium text-gray-400">---</span>
            </div>
          </div>
        )}

        {!currentDevice.is_offline && (
          <>
            {criticalWaterQualityAlert?.isActive && (
              <div className="text-xs text-purple-600 dark:text-purple-300 mt-2 pt-2 border-t border-purple-400/50 dark:border-purple-700/50">
                <strong className="flex items-center">
                  <ShieldAlert className="h-3 w-3 mr-1" />
                  Pesan Kualitas Kritis:
                </strong>
                <p>
                  {parseAlertMessageDetail(
                    criticalWaterQualityAlert.message,
                    "Kualitas Air Mencapai Level Kritis!"
                  )}
                </p>
                <p className="text-xs opacity-80">
                  Data:{" "}
                  {new Date(
                    criticalWaterQualityAlert.timestamp
                  ).toLocaleTimeString("id-ID")}
                </p>
              </div>
            )}
            {rapidRiseAlert?.isActive && (
              <div className="text-xs text-orange-600 dark:text-orange-300 mt-2 pt-2 border-t border-orange-400/50 dark:border-orange-700/50">
                <strong className="flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Peringatan Laju Kenaikan:
                </strong>
                <p>
                  Naik: {rapidRiseAlert.rateOfChange_cm_per_minute.toFixed(1)}{" "}
                  cm/menit
                </p>
                <p className="text-xs opacity-80">
                  (dari {rapidRiseAlert.previousWaterLevel_cm}cm ke{" "}
                  {rapidRiseAlert.currentWaterLevel_cm}cm dalam{" "}
                  {rapidRiseAlert.checkInterval_seconds}d)
                </p>
                <p className="text-xs opacity-80">
                  Data:{" "}
                  {new Date(rapidRiseAlert.timestamp).toLocaleTimeString(
                    "id-ID"
                  )}
                </p>
              </div>
            )}
            {floodAlert?.isActive && (
              <div className="text-xs text-red-600 dark:text-red-300 mt-2 pt-2 border-t border-red-400/50 dark:border-red-700/50">
                <strong className="flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Pesan Alert Banjir:
                </strong>
                <p>
                  {parseAlertMessageDetail(
                    floodAlert.message,
                    "Kondisi Kritis Terdeteksi"
                  )}
                </p>
                <p className="text-xs opacity-80">
                  Terdeteksi:{" "}
                  {new Date(floodAlert.serverTimestamp).toLocaleString("id-ID")}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-3 pb-3 px-4 border-t border-border/50">
        <div className="flex items-center text-xs text-muted-foreground self-center sm:self-auto mb-2 sm:mb-0">
          {isLoading && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
          Update: {displayTimestamp}
          {!isLoading && (
            <span title="Muat Ulang Data Kartu">
              <RefreshCw
                className="h-3 w-3 ml-1.5 cursor-pointer hover:text-primary"
                onClick={fetchData}
              />
            </span>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link
            href={`/dashboard/history/${currentDevice.device_id}`}
            passHref
            className="flex-1 sm:flex-initial"
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs px-3 py-1.5 h-auto"
            >
              Riwayat
            </Button>
          </Link>
          <Link
            href={`/dashboard/device/${currentDevice.device_id}`}
            passHref
            className="flex-1 sm:flex-initial"
          >
            <Button
              variant="default"
              size="sm"
              className="w-full text-xs px-3 py-1.5 h-auto"
            >
              Lihat Detail
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
