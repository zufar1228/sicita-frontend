// app/dashboard/device/[deviceId]/page.tsx
"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { getBackendUrl } from "@/lib/demo/utils";
import { useSelectedDevice } from "../../../../contexts/SelectedDeviceContext";
import {
  RAINFALL_THRESHOLD_NO_RAIN_MAX,
  RAINFALL_THRESHOLD_LIGHT_RAIN_MAX,
  RAINFALL_THRESHOLD_MODERATE_RAIN_MAX,
} from "@/lib/constants";

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
import { getSocket } from "@/lib/socket";
import { Socket } from "socket.io-client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Thermometer,
  Droplet,
  CloudRain,
  Info,
  Loader2,
  Gauge,
  Activity,
} from "lucide-react";
import {
  Alert,
  AlertDescription as ShadUIAlertDescription,
} from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
  type ChartConfig as ShadCNChartConfig,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

// --- Fungsi Helper & Tipe Data ---

// ▼▼▼ LANGKAH 1: Tambahkan fungsi helper baru ini di luar komponen utama ▼▼▼
const getSiagaLevel = (
  currentLevel: number | null | undefined,
  maxHeight: number | null | undefined
): { text: string; colorClass: string } | null => {
  if (
    currentLevel === null ||
    currentLevel === undefined ||
    maxHeight === null ||
    maxHeight === undefined ||
    maxHeight === 0
  ) {
    return null; // Tidak bisa menghitung jika data tidak ada
  }

  const percentage = (currentLevel / maxHeight) * 100;

  if (percentage <= 50) {
    return {
      text: "Siaga 4 (Normal)",
      colorClass: "bg-green-700 hover:bg-green-800 text-white", // Normal
    };
  } else if (percentage <= 75) {
    return {
      text: "Siaga 3 (Waspada)",
      colorClass: "bg-yellow-600 hover:bg-yellow-700 text-white", // Waspada
    };
  } else if (percentage < 100) {
    return {
      text: "Siaga 2 (Siaga)",
      colorClass: "bg-orange-500 hover:bg-orange-600 text-white", // Siaga
    };
  } else {
    return {
      text: "Siaga 1 (Bahaya)",
      colorClass: "bg-red-500 hover:bg-red-600 text-white", // Bahaya
    };
  }
};

const getDisplayRainfallCategory = (
  rawValue: number | null | undefined
): string => {
  if (rawValue === null || rawValue === undefined) {
    return "Tidak Hujan";
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

// ... (Sisa tipe data dan fungsi helper tidak berubah) ...
interface RawSensorReading {
  device_id: string;
  timestamp: string;
  water_level_cm?: string | number | null;
  raw_distance_cm?: string | number | null;
  temperature_c?: string | number | null;
  ph_value?: string | number | null;
  turbidity_ntu?: string | number | null;
  tds_ppm?: string | number | null;
  rainfall_value_raw?: string | number | null;
  rainfall_category?: string | null;
  water_quality_category?: string | null;
  [key: string]: unknown;
}

interface DevicePageSocketEvents {
  new_sensor_data: (data: RawSensorReading) => void;
  flood_alert: (data: FloodAlertData) => void;
  rapid_rise_alert: (data: RapidRiseAlertData) => void;
  water_quality_update: (data: WaterQualityUpdateData) => void;
  critical_water_quality_alert: (data: CriticalWaterQualityAlertData) => void;
  rainfall_update: (data: RainfallUpdateData) => void;
  device_status_update: (data: DeviceStatusUpdateData) => void;
  device_updated: (data: Device) => void;
  alert_resolved?: (data: {
    deviceId: string;
    alertType: string;
    alertId: string | number;
    resolved_at: string;
    message?: string;
  }) => void;
}

interface DevicePageChartDataPoint {
  timestampLabel: string;
  originalTimestamp: Date;
  waterLevel?: number | null;
  temperature?: number | null;
  rainfall?: number | null;
  tdsPpm?: number | null;
  turbidityNtu?: number | null;
}

type ChartConfig = Record<string, { label: string; color: string }>;

class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Terjadi kesalahan yang tidak diketahui.";
}

const ChartContentSkeletonView = () => (
  <div className="flex h-full w-full items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const processSensorValue = (value: unknown): number | null => {
  if (value === null || value === undefined || String(value).trim() === "")
    return null;
  const num = Number(value);
  return isNaN(num) || !isFinite(num) ? null : num;
};

const processSensorData = (
  rawData: RawSensorReading | null | undefined
): Partial<SensorData> => {
  if (!rawData) return {};
  const processed: Partial<SensorData> = {};

  if (rawData.device_id) processed.device_id = String(rawData.device_id);
  if (rawData.timestamp) processed.timestamp = String(rawData.timestamp);

  processed.water_level_cm = processSensorValue(rawData.water_level_cm);
  processed.raw_distance_cm = processSensorValue(rawData.raw_distance_cm);
  processed.temperature_c = processSensorValue(rawData.temperature_c);
  processed.ph_value = processSensorValue(rawData.ph_value);
  processed.turbidity_ntu = processSensorValue(rawData.turbidity_ntu);
  processed.tds_ppm = processSensorValue(rawData.tds_ppm);
  processed.rainfall_value_raw = processSensorValue(rawData.rainfall_value_raw);

  processed.rainfall_category = rawData.rainfall_category
    ? String(rawData.rainfall_category)
    : undefined;
  processed.water_quality_category = rawData.water_quality_category
    ? String(rawData.water_quality_category)
    : undefined;

  return processed;
};

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deviceIdFromUrl = params?.deviceId as string | undefined;

  const { data: session, status: sessionStatus } = useSession();
  const { setSelectedDeviceId } = useSelectedDevice();

  const [deviceDetails, setDeviceDetails] = useState<Device | null>(null);
  const [isLoadingDevice, setIsLoadingDevice] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [latestSensorData, setLatestSensorData] =
    useState<Partial<SensorData> | null>(null);
  const [rainfallStatus, setRainfallStatus] =
    useState<RainfallUpdateData | null>(null);
  const [waterQualityStatus, setWaterQualityStatus] =
    useState<WaterQualityUpdateData | null>(null);
  const [activeFloodAlert, setActiveFloodAlert] =
    useState<FloodAlertData | null>(null);
  const [activeRapidRiseAlert, setActiveRapidRiseAlert] =
    useState<RapidRiseAlertData | null>(null);
  const [activeCriticalWQAlert, setActiveCriticalWQAlert] =
    useState<CriticalWaterQualityAlertData | null>(null);
  const [summaryHistoricalData, setSummaryHistoricalData] = useState<
    DevicePageChartDataPoint[]
  >([]);
  const [isLoadingSummaryHistory, setIsLoadingSummaryHistory] =
    useState<boolean>(false);
  type DetailTempRainMode = "temp_only" | "rain_only" | "both";
  const [detailTempRainMode, setDetailTempRainMode] =
    useState<DetailTempRainMode>("both");
  const backendUrl = getBackendUrl();

  const waterLevelChartRef = useRef<HTMLDivElement>(null);
  const tempRainChartRef = useRef<HTMLDivElement>(null);
  const tdsChartRef = useRef<HTMLDivElement>(null);
  const turbidityChartRef = useRef<HTMLDivElement>(null);

  type ChartKey = "waterLevel" | "tempRain" | "tds" | "turbidity";

  const handleScrollToChart = (chartKey: ChartKey) => {
    const refsMap = {
      waterLevel: waterLevelChartRef,
      tempRain: tempRainChartRef,
      tds: tdsChartRef,
      turbidity: turbidityChartRef,
    };
    const targetRef = refsMap[chartKey];
    targetRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const fetchInitialPageData = useCallback(async () => {
    if (
      !deviceIdFromUrl ||
      sessionStatus !== "authenticated" ||
      !backendUrl ||
      !session?.user?.backendToken
    ) {
      setIsLoadingDevice(false);
      setIsLoadingSummaryHistory(false);
      if (sessionStatus === "unauthenticated") {
        setFetchError("Sesi tidak terautentikasi. Silakan login kembali.");
      } else if (!deviceIdFromUrl) {
        setFetchError("ID Perangkat tidak ditemukan di URL.");
      }
      return;
    }

    setIsLoadingDevice(true);
    setIsLoadingSummaryHistory(true);
    setFetchError(null);

    try {
      const resDevice = await fetch(
        `${backendUrl}/api/devices/${deviceIdFromUrl}`,
        { headers: { Authorization: `Bearer ${session.user!.backendToken}` } }
      );
      if (!resDevice.ok) {
        if (resDevice.status === 404) {
          throw new AppError(
            `Perangkat dengan ID ${deviceIdFromUrl} tidak ditemukan.`,
            resDevice.status
          );
        }
        throw new Error(
          `Gagal mengambil detail perangkat (${resDevice.status})`
        );
      }
      const fetchedDevice: Device = await resDevice.json();
      setDeviceDetails(fetchedDevice);

      try {
        const resLatestReading = await fetch(
          `${backendUrl}/api/devices/${deviceIdFromUrl}/latest-reading`,
          { headers: { Authorization: `Bearer ${session.user!.backendToken}` } }
        );

        if (resLatestReading.ok) {
          const fetchedLatestReadingRaw: RawSensorReading | null =
            await resLatestReading.json();

          if (fetchedLatestReadingRaw) {
            const processedLatestReading = processSensorData(
              fetchedLatestReadingRaw
            );
            setLatestSensorData(processedLatestReading);

            if (
              processedLatestReading.rainfall_value_raw !== null &&
              processedLatestReading.rainfall_value_raw !== undefined
            ) {
              setRainfallStatus({
                deviceId: processedLatestReading.device_id!,
                rainfall_raw_value: processedLatestReading.rainfall_value_raw,
                rainfall_category:
                  processedLatestReading.rainfall_category || "Memproses...",
                timestamp: processedLatestReading.timestamp!,
              });
            } else {
              setRainfallStatus(null);
            }

            if (
              processedLatestReading.water_quality_category ||
              processedLatestReading.ph_value !== null ||
              processedLatestReading.turbidity_ntu !== null ||
              processedLatestReading.tds_ppm !== null
            ) {
              setWaterQualityStatus({
                deviceId: processedLatestReading.device_id!,
                ph_value: processedLatestReading.ph_value ?? null,
                turbidity_ntu: processedLatestReading.turbidity_ntu ?? null,
                tds_ppm: processedLatestReading.tds_ppm ?? null,
                qualityCategory:
                  processedLatestReading.water_quality_category ||
                  "Memproses...",
                timestamp: processedLatestReading.timestamp!,
              });
            } else {
              setWaterQualityStatus(null);
            }
          } else {
            setLatestSensorData(null);
            setRainfallStatus(null);
            setWaterQualityStatus(null);
          }
        } else {
          console.error(
            `Gagal mengambil data sensor terakhir dari endpoint (${resLatestReading.status})`
          );
          setLatestSensorData(null);
          setRainfallStatus(null);
          setWaterQualityStatus(null);
        }
      } catch (latestReadingError) {
        console.error(
          "Error fetching latest reading from endpoint:",
          getErrorMessage(latestReadingError)
        );
        setLatestSensorData(null);
        setRainfallStatus(null);
        setWaterQualityStatus(null);
      }

      const resHistory = await fetch(
        `${backendUrl}/api/sensor-data/history/${deviceIdFromUrl}?limit=60&sortOrder=DESC`,
        { headers: { Authorization: `Bearer ${session.user!.backendToken}` } }
      );
      if (!resHistory.ok)
        throw new Error(
          `Gagal mengambil ringkasan riwayat data (${resHistory.status})`
        );
      const summaryHistoryRaw: RawSensorReading[] = (
        await resHistory.json()
      ).reverse();

      const formattedSummaryHistory: DevicePageChartDataPoint[] =
        summaryHistoryRaw.map((d_raw) => {
          const d = processSensorData(d_raw);
          return {
            timestampLabel: new Date(d.timestamp!).toLocaleString("id-ID", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
            originalTimestamp: new Date(d.timestamp!),
            waterLevel: d.water_level_cm,
            temperature: d.temperature_c,
            rainfall: d.rainfall_value_raw,
            tdsPpm: d.tds_ppm,
            turbidityNtu: d.turbidity_ntu,
          };
        });
      setSummaryHistoricalData(formattedSummaryHistory);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setFetchError(message);
      if (!(err instanceof AppError && err.statusCode === 404)) {
        toast.error("Gagal Memuat Data Halaman", { description: message });
      }
      setDeviceDetails(null);
    } finally {
      setIsLoadingDevice(false);
      setIsLoadingSummaryHistory(false);
    }
  }, [session?.user, deviceIdFromUrl, sessionStatus, backendUrl]);

  useEffect(() => {
    if (deviceIdFromUrl && sessionStatus === "authenticated") {
      setSelectedDeviceId(deviceIdFromUrl, { navigate: false });
      fetchInitialPageData();
    } else if (
      !deviceIdFromUrl &&
      sessionStatus !== "loading" &&
      sessionStatus !== "authenticated"
    ) {
      setFetchError("ID Perangkat tidak valid atau tidak ada.");
      setIsLoadingDevice(false);
      setIsLoadingSummaryHistory(false);
    }
  }, [
    deviceIdFromUrl,
    sessionStatus,
    setSelectedDeviceId,
    fetchInitialPageData,
  ]);

  const handleRefreshData = useCallback(async () => {
    toast.info("Memuat ulang data perangkat...");
    await fetchInitialPageData();
  }, [fetchInitialPageData]);

  useEffect(() => {
    if (
      !deviceIdFromUrl ||
      sessionStatus !== "authenticated" ||
      !backendUrl ||
      !session?.user?.backendToken
    ) {
      return;
    }
    const socket: Socket<DevicePageSocketEvents> = getSocket(
      backendUrl,
      session.user.backendToken
    );

    if (!socket.connected) {
      socket.connect();
    }

    const handleNewSensorData = (rawData: RawSensorReading) => {
      if (rawData && rawData.device_id === deviceIdFromUrl) {
        const data = processSensorData(rawData);
        setLatestSensorData(data);

        setSummaryHistoricalData((prev) => {
          const newPoint: DevicePageChartDataPoint = {
            timestampLabel: new Date(data.timestamp!).toLocaleString("id-ID", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
            originalTimestamp: new Date(data.timestamp!),
            waterLevel: data.water_level_cm,
            temperature: data.temperature_c,
            rainfall: data.rainfall_value_raw,
            tdsPpm: data.tds_ppm,
            turbidityNtu: data.turbidity_ntu,
          };
          const updatedHistory = [...prev, newPoint];
          return updatedHistory.slice(-60);
        });
      }
    };
    const handleRainfallUpdate = (data: RainfallUpdateData) => {
      if (data.deviceId === deviceIdFromUrl) setRainfallStatus(data);
    };
    const handleWaterQualityUpdate = (data: WaterQualityUpdateData) => {
      if (data.deviceId === deviceIdFromUrl) {
        setWaterQualityStatus(data);
        setLatestSensorData((prev) => ({
          ...prev,
          device_id: data.deviceId,
          timestamp: data.timestamp,
          tds_ppm: data.tds_ppm ?? prev?.tds_ppm,
          turbidity_ntu: data.turbidity_ntu ?? prev?.turbidity_ntu,
          water_quality_category: data.qualityCategory,
          ph_value: data.ph_value ?? prev?.ph_value,
        }));
      }
    };
    const handleFloodAlert = (data: FloodAlertData) => {
      if (data.deviceId === deviceIdFromUrl) {
        setActiveFloodAlert(data.isActive ? data : null);
      } else if (
        activeFloodAlert?.deviceId === data.deviceId &&
        !data.isActive
      ) {
        setActiveFloodAlert(null);
      }
    };
    const handleRapidRiseAlert = (data: RapidRiseAlertData) => {
      if (data.deviceId === deviceIdFromUrl) {
        setActiveRapidRiseAlert(data.isActive ? data : null);
      } else if (
        activeRapidRiseAlert?.deviceId === data.deviceId &&
        !data.isActive
      ) {
        setActiveRapidRiseAlert(null);
      }
    };
    const handleCriticalWQAlert = (data: CriticalWaterQualityAlertData) => {
      if (data.deviceId === deviceIdFromUrl) {
        setActiveCriticalWQAlert(data.isActive ? data : null);
      } else if (
        activeCriticalWQAlert?.deviceId === data.deviceId &&
        !data.isActive
      ) {
        setActiveCriticalWQAlert(null);
      }
    };
    const handleAlertResolved = (data: {
      deviceId: string;
      alertType: string;
    }) => {
      if (data.deviceId === deviceIdFromUrl) {
        if (data.alertType === "flood") setActiveFloodAlert(null);
        if (data.alertType === "rapid_rise") setActiveRapidRiseAlert(null);
        if (data.alertType === "critical_water_quality")
          setActiveCriticalWQAlert(null);
      }
    };
    const handleDeviceStatusUpdate = (data: DeviceStatusUpdateData) => {
      if (data.deviceId === deviceIdFromUrl && deviceDetails) {
        setDeviceDetails((prev) =>
          prev
            ? {
                ...prev,
                is_offline: data.is_offline,
                location: data.location ?? prev.location,
                name: data.name ?? prev.name,
                last_seen_at: data.last_seen_at ?? prev.last_seen_at,
              }
            : null
        );
      }
    };
    const handleDeviceUpdated = (data: Device) => {
      if (data.device_id === deviceIdFromUrl) {
        setDeviceDetails(data);
      }
    };

    socket.on("new_sensor_data", handleNewSensorData);
    socket.on("rainfall_update", handleRainfallUpdate);
    socket.on("water_quality_update", handleWaterQualityUpdate);
    socket.on("flood_alert", handleFloodAlert);
    socket.on("rapid_rise_alert", handleRapidRiseAlert);
    socket.on("critical_water_quality_alert", handleCriticalWQAlert);
    socket.on("device_status_update", handleDeviceStatusUpdate);
    socket.on("device_updated", handleDeviceUpdated);
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
      socket.off("device_updated", handleDeviceUpdated);
      socket.off("alert_resolved", handleAlertResolved);
    };
  }, [
    deviceIdFromUrl,
    sessionStatus,
    backendUrl,
    session?.user?.backendToken,
    deviceDetails,
    activeFloodAlert,
    activeRapidRiseAlert,
    activeCriticalWQAlert,
  ]);

  const color1Var = `var(--chart-1)`;
  const color2Var = `var(--chart-2)`;
  const color3Var = `var(--chart-3)`;
  const color4Var = `var(--chart-4)`;

  const waterLevelChartConfig = useMemo(
    (): ChartConfig => ({
      waterLevel: { label: "Ketinggian Air (cm)", color: color1Var },
    }),
    [color1Var]
  );

  const tempRainChartConfig = useMemo((): ChartConfig => {
    const config: ChartConfig = {};
    if (detailTempRainMode === "temp_only" || detailTempRainMode === "both") {
      config.temperature = { label: "Suhu (°C)", color: color1Var };
    }
    if (detailTempRainMode === "rain_only" || detailTempRainMode === "both") {
      config.rainfall = { label: "Curah Hujan (Raw)", color: color2Var };
    }
    return config;
  }, [detailTempRainMode, color1Var, color2Var]);

  const tdsChartConfig = useMemo(
    (): ChartConfig => ({
      tdsPpm: { label: "TDS (ppm)", color: color3Var },
    }),
    [color3Var]
  );

  const turbidityChartConfig = useMemo(
    (): ChartConfig => ({
      turbidityNtu: { label: "Kekeruhan (NTU)", color: color4Var },
    }),
    [color4Var]
  );

  // Bagian render Loading dan Error tidak berubah...
  if (isLoadingDevice && !deviceDetails && !fetchError) {
    return (
      <div className="container mx-auto p-4 lg:p-6 space-y-6 animate-pulse">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Skeleton className="h-8 w-32 mb-2 sm:mb-2 bg-muted" />
            <Skeleton className="h-10 w-72 mb-1 bg-muted" />
            <Skeleton className="h-4 w-52 mb-1 bg-muted" />
            <Skeleton className="h-3 w-40 bg-muted" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="shadow-none border-border">
              <CardHeader>
                <Skeleton className="h-6 w-1/2 mb-2 bg-muted" />
                <Skeleton className="h-4 w-3/4 bg-muted" />
              </CardHeader>
              <CardContent className="h-[300px] p-0 flex items-center justify-center bg-card">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="container mx-auto p-4 lg:p-6 flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive mb-2">
          Gagal Memuat Data Perangkat
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md">{fetchError}</p>
        <Button onClick={() => router.push("/dashboard/all")} size="lg">
          <ArrowLeft className="mr-2 h-5 w-5" /> Kembali ke Semua Perangkat
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={handleRefreshData}
          className="mt-2"
        >
          <RefreshCw className="mr-2 h-5 w-5" /> Coba Lagi
        </Button>
      </div>
    );
  }

  if (!deviceDetails && deviceIdFromUrl) {
    return (
      <div className="container mx-auto p-4 lg:p-6 flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <Info className="h-16 w-16 text-blue-500 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">
          Perangkat Tidak Ditemukan
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          {`Perangkat dengan ID '${deviceIdFromUrl}' tidak dapat ditemukan atau Anda tidak memiliki akses.`}
        </p>
        <Button onClick={() => router.push("/dashboard/all")} size="lg">
          <ArrowLeft className="mr-2 h-5 w-5" /> Kembali ke Semua Perangkat
        </Button>
      </div>
    );
  }

  if (!deviceDetails) {
    // Kondisi ini seharusnya jarang terjadi jika logic di atas sudah benar
    return (
      <div className="container mx-auto p-4 lg:p-6 flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <Info className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">
          Informasi Perangkat Tidak Tersedia
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Tidak ada detail yang dapat ditampilkan untuk perangkat ini.
        </p>
        <Button onClick={() => router.push("/dashboard/all")} size="lg">
          <ArrowLeft className="mr-2 h-5 w-5" /> Kembali ke Semua Perangkat
        </Button>
      </div>
    );
  }

  const getDeviceStatusBadge = () => {
    if (deviceDetails?.is_offline) {
      return <Badge variant="destructive">Offline</Badge>;
    }
    return (
      <Badge
        variant="default"
        className="bg-green-500 hover:bg-green-600 text-white"
      >
        Online
      </Badge>
    );
  };

  // Panggil fungsi helper untuk mendapatkan info siaga
  const siagaInfo = getSiagaLevel(
    latestSensorData?.water_level_cm,
    deviceDetails?.sensor_height_cm
  );

  return (
    <div className="container mx-auto px-4 pb-4 lg:px-6 lg:pb-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Button
            onClick={() => router.push("/dashboard/all")}
            size="sm"
            className="mb-2 sm:mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4 " /> Kembali ke Semua Perangkat
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
            {deviceDetails?.name || deviceIdFromUrl} {getDeviceStatusBadge()}
          </h1>
          <p className="text-sm text-muted-foreground">
            {deviceDetails?.location || "Lokasi tidak diatur"}
          </p>
          <p className="text-xs text-muted-foreground">ID: {deviceIdFromUrl}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            onClick={handleRefreshData}
            disabled={isLoadingDevice || isLoadingSummaryHistory}
            title="Muat Ulang Data"
          >
            {isLoadingDevice || isLoadingSummaryHistory ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Alerts Section */}
      {activeFloodAlert && (
        <Alert variant="destructive" className="animate-pulse">
          <AlertTriangle className="h-4 w-4" />
          <ShadUIAlertDescription>
            <strong>PERINGATAN BANJIR AKTIF!</strong> Ketinggian:{" "}
            {activeFloodAlert.waterLevel_cm}cm. Ambang:{" "}
            {activeFloodAlert.thresholdCm || "N/A"}cm. (
            {new Date(activeFloodAlert.timestamp).toLocaleTimeString("id-ID")})
            <br />
            {activeFloodAlert.message}
          </ShadUIAlertDescription>
        </Alert>
      )}
      {activeRapidRiseAlert && (
        <Alert variant="destructive" className="animate-pulse">
          <AlertTriangle className="h-4 w-4" />
          <ShadUIAlertDescription>
            <strong>KENAIKAN AIR CEPAT!</strong> Laju:{" "}
            {activeRapidRiseAlert.rateOfChange_cm_per_minute.toFixed(1)}{" "}
            cm/menit. Air: {activeRapidRiseAlert.currentWaterLevel_cm}cm. (
            {new Date(activeRapidRiseAlert.timestamp).toLocaleTimeString(
              "id-ID"
            )}
            ) <br />
            {activeRapidRiseAlert.message}
          </ShadUIAlertDescription>
        </Alert>
      )}
      {activeCriticalWQAlert && (
        <Alert variant="destructive" className="animate-pulse">
          <AlertTriangle className="h-4 w-4" />
          <ShadUIAlertDescription>
            <strong>
              KUALITAS AIR KRITIS ({activeCriticalWQAlert.qualityCategory})!
            </strong>{" "}
            Kekeruhan: {activeCriticalWQAlert.turbidity_ntu ?? "N/A"} NTU, TDS:{" "}
            {activeCriticalWQAlert.tds_ppm ?? "N/A"} ppm. (
            {new Date(activeCriticalWQAlert.timestamp).toLocaleTimeString(
              "id-ID"
            )}
            ) <br />
            {activeCriticalWQAlert.message}
          </ShadUIAlertDescription>
        </Alert>
      )}

      {/* Kartu Data Terkini */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {/* ▼▼▼ LANGKAH 2: Modifikasi Kartu Ketinggian Air ▼▼▼ */}
        <Card
          className="xl:col-span-1 cursor-pointer transition-transform hover:-translate-y-1"
          onClick={() => handleScrollToChart("waterLevel")}
        >
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Droplet className="mr-2 h-5 w-5 text-blue-500" /> Ketinggian Air
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {latestSensorData?.water_level_cm?.toFixed(1) ?? "---"} cm
            </div>
            {/* Menampilkan Badge Status Siaga */}
            {siagaInfo && (
              <Badge variant="default" className={siagaInfo.colorClass}>
                {siagaInfo.text}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Kartu-kartu lainnya tidak berubah */}
        <Card
          className="xl:col-span-1 cursor-pointer transition-transform hover:-translate-y-1"
          onClick={() => handleScrollToChart("tempRain")}
        >
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Thermometer className="mr-2 h-5 w-5 text-red-500" /> Suhu Air
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {latestSensorData?.temperature_c?.toFixed(1) ?? "---"} °C
          </CardContent>
        </Card>
        <Card
          className="xl:col-span-1 cursor-pointer transition-transform hover:-translate-y-1"
          onClick={() => handleScrollToChart("tempRain")}
        >
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <CloudRain className="mr-2 h-5 w-5 text-sky-500" /> Status Hujan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {getDisplayRainfallCategory(
                rainfallStatus?.rainfall_raw_value ??
                  latestSensorData?.rainfall_value_raw
              )}
            </p>
            {(rainfallStatus?.rainfall_raw_value ??
              latestSensorData?.rainfall_value_raw) !== null &&
              (rainfallStatus?.rainfall_raw_value ??
                latestSensorData?.rainfall_value_raw) !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Nilai:{" "}
                  {(
                    rainfallStatus?.rainfall_raw_value ??
                    latestSensorData?.rainfall_value_raw
                  )?.toString()}
                </p>
              )}
          </CardContent>
        </Card>
        <Card
          className="xl:col-span-1 cursor-pointer transition-transform hover:-translate-y-1"
          onClick={() => handleScrollToChart("tds")}
        >
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Activity className="mr-2 h-5 w-5 text-lime-500" /> TDS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {latestSensorData?.tds_ppm?.toFixed(0) ?? "---"} ppm
            </p>
            {waterQualityStatus &&
              waterQualityStatus.qualityCategory &&
              waterQualityStatus.qualityCategory !== "Memproses..." && (
                <p className="text-xs text-muted-foreground pt-1">
                  Kat. Umum: {waterQualityStatus.qualityCategory}
                </p>
              )}
          </CardContent>
        </Card>
        <Card
          className="xl:col-span-1 cursor-pointer transition-transform hover:-translate-y-1"
          onClick={() => handleScrollToChart("turbidity")}
        >
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Gauge className="mr-2 h-5 w-5 text-teal-500" /> Kekeruhan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {latestSensorData?.turbidity_ntu?.toFixed(1) ?? "---"} NTU
            </p>
            {waterQualityStatus &&
              waterQualityStatus.qualityCategory &&
              waterQualityStatus.qualityCategory !== "Memproses..." && (
                <p className="text-xs text-muted-foreground pt-1">
                  Kat. Umum: {waterQualityStatus.qualityCategory}
                </p>
              )}
          </CardContent>
        </Card>
      </div>

      {/* BAGIAN CHART tidak berubah */}
      <div className="grid grid-cols-1 gap-6">
        <Card ref={waterLevelChartRef}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Droplet
                className="mr-2 h-5 w-5"
                style={{ color: waterLevelChartConfig.waterLevel?.color }}
              />
              Grafik Ketinggian Air
            </CardTitle>
            <CardDescription className="text-xs">
              Tren ketinggian air terkini (maks 60 data terakhir).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] p-0">
            {isLoadingSummaryHistory && summaryHistoricalData.length === 0 ? (
              <ChartContentSkeletonView />
            ) : summaryHistoricalData.length > 0 &&
              summaryHistoricalData.some((d) => d.waterLevel != null) ? (
              <div className="px-2 pt-4 sm:px-6 sm:pt-6 h-full">
                <ChartContainer
                  config={waterLevelChartConfig as ShadCNChartConfig}
                  className="w-full h-full"
                >
                  <AreaChart
                    data={summaryHistoricalData}
                    margin={{ top: 5, right: 20, left: -10, bottom: 20 }}
                  >
                    <defs>
                      {waterLevelChartConfig.waterLevel?.color && (
                        <linearGradient
                          id="fillWaterLevelRingkasan"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={waterLevelChartConfig.waterLevel.color}
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor={waterLevelChartConfig.waterLevel.color}
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      )}
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      strokeOpacity={0.5}
                    />
                    <XAxis
                      dataKey="timestampLabel"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={30}
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      yAxisId="left"
                      dataKey="waterLevel"
                      name={waterLevelChartConfig.waterLevel?.label.replace(
                        " : ",
                        ""
                      )}
                      stroke={waterLevelChartConfig.waterLevel?.color}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => `${value}cm`}
                      domain={["dataMin - 5", "dataMax + 5"]}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      content={
                        <ChartTooltipContent
                          indicator="dot"
                          labelFormatter={(label, payload) =>
                            payload?.[0]
                              ? new Date(
                                  (
                                    payload[0]
                                      .payload as DevicePageChartDataPoint
                                  ).originalTimestamp
                                ).toLocaleString("id-ID", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })
                              : label
                          }
                          formatter={(value, name, props) => {
                            const configEntry =
                              waterLevelChartConfig[
                                props.dataKey as keyof ChartConfig
                              ];
                            if (typeof value === "number" && configEntry)
                              return [
                                `${value.toFixed(1)} cm`,
                                ` => ${configEntry.label}`,
                              ];
                            return [String(value), String(name)];
                          }}
                        />
                      }
                    />
                    {waterLevelChartConfig.waterLevel && (
                      <Area
                        yAxisId="left"
                        dataKey="waterLevel"
                        type="monotone"
                        fill="url(#fillWaterLevelRingkasan)"
                        stroke={waterLevelChartConfig.waterLevel.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{
                          r: 5,
                          strokeWidth: 1,
                          fill: "var(--background)",
                          stroke: waterLevelChartConfig.waterLevel.color,
                        }}
                        connectNulls={true}
                        name={waterLevelChartConfig.waterLevel.label.replace(
                          " : ",
                          ""
                        )}
                      />
                    )}
                    <RechartsLegend content={<ChartLegendContent />} />
                  </AreaChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-center p-4 text-muted-foreground">
                <Info className="w-6 h-6 mb-1" />
                <p className="text-xs">
                  Data grafik ketinggian air tidak tersedia.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card ref={tempRainChartRef}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <CardTitle className="text-lg flex items-center">
                  <Thermometer
                    className="mr-2 h-5 w-5"
                    style={{
                      color:
                        tempRainChartConfig.temperature?.color || color1Var,
                    }}
                  />
                  Grafik Suhu & Hujan
                </CardTitle>
                <CardDescription className="text-xs">
                  Tren suhu dan curah hujan (maks 60 data terakhir).
                </CardDescription>
              </div>
              <ToggleGroup
                type="single"
                size="sm"
                variant="outline"
                value={detailTempRainMode}
                onValueChange={(value) => {
                  if (value) setDetailTempRainMode(value as DetailTempRainMode);
                }}
                className="mt-1 xs:mt-0 self-start xs:self-center"
              >
                <ToggleGroupItem
                  value="temp_only"
                  aria-label="Hanya Suhu"
                  className="text-xs px-2 h-7"
                >
                  Suhu
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="rain_only"
                  aria-label="Hanya Curah Hujan"
                  className="text-xs px-2 h-7"
                >
                  Hujan
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="both"
                  aria-label="Keduanya"
                  className="text-xs px-5 h-7"
                >
                  Keduanya
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] p-0">
            {isLoadingSummaryHistory && summaryHistoricalData.length === 0 ? (
              <ChartContentSkeletonView />
            ) : summaryHistoricalData.length > 0 &&
              summaryHistoricalData.some(
                (d) =>
                  (detailTempRainMode === "temp_only" ||
                  detailTempRainMode === "both"
                    ? d.temperature != null
                    : false) ||
                  (detailTempRainMode === "rain_only" ||
                  detailTempRainMode === "both"
                    ? d.rainfall != null
                    : false)
              ) ? (
              <div className="px-2 pt-4 sm:px-4 h-full">
                <ChartContainer
                  config={tempRainChartConfig as ShadCNChartConfig}
                  className="w-full h-full"
                >
                  <AreaChart
                    data={summaryHistoricalData}
                    margin={{
                      top: 5,
                      right: detailTempRainMode === "both" ? -28 : 10,
                      left: -20,
                      bottom: 20,
                    }}
                  >
                    <defs>
                      {(detailTempRainMode === "temp_only" ||
                        detailTempRainMode === "both") &&
                        tempRainChartConfig.temperature?.color && (
                          <linearGradient
                            id="fillTempRingkasan"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={tempRainChartConfig.temperature.color}
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor={tempRainChartConfig.temperature.color}
                              stopOpacity={0.1}
                            />
                          </linearGradient>
                        )}
                      {(detailTempRainMode === "rain_only" ||
                        detailTempRainMode === "both") &&
                        tempRainChartConfig.rainfall?.color && (
                          <linearGradient
                            id="fillRainRingkasan"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={tempRainChartConfig.rainfall.color}
                              stopOpacity={0.7}
                            />
                            <stop
                              offset="95%"
                              stopColor={tempRainChartConfig.rainfall.color}
                              stopOpacity={0.1}
                            />
                          </linearGradient>
                        )}
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      strokeOpacity={0.5}
                    />
                    <XAxis
                      dataKey="timestampLabel"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={30}
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    {(detailTempRainMode === "temp_only" ||
                      detailTempRainMode === "both") &&
                      tempRainChartConfig.temperature && (
                        <YAxis
                          yAxisId="left"
                          dataKey="temperature"
                          name={tempRainChartConfig.temperature.label.replace(
                            " : ",
                            ""
                          )}
                          stroke={tempRainChartConfig.temperature.color}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `${Number(v).toFixed(1)}°C`}
                          domain={["auto", "auto"]}
                        />
                      )}
                    {detailTempRainMode === "rain_only" &&
                      tempRainChartConfig.rainfall && (
                        <YAxis
                          yAxisId="left"
                          dataKey="rainfall"
                          name={tempRainChartConfig.rainfall.label.replace(
                            " : ",
                            ""
                          )}
                          stroke={tempRainChartConfig.rainfall.color}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `${v}`}
                          domain={["auto", "auto"]}
                          allowDecimals={false}
                        />
                      )}
                    {detailTempRainMode === "both" &&
                      tempRainChartConfig.rainfall && (
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          dataKey="rainfall"
                          name={tempRainChartConfig.rainfall.label.replace(
                            " : ",
                            ""
                          )}
                          stroke={tempRainChartConfig.rainfall.color}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `${v}`}
                          domain={["auto", "auto"]}
                          allowDecimals={false}
                        />
                      )}
                    <RechartsTooltip
                      content={
                        <ChartTooltipContent
                          indicator="dot"
                          labelFormatter={(label, payload) =>
                            payload?.[0]
                              ? new Date(
                                  (
                                    payload[0]
                                      .payload as DevicePageChartDataPoint
                                  ).originalTimestamp
                                ).toLocaleString("id-ID", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })
                              : label
                          }
                          formatter={(value, name, props) => {
                            const configEntry =
                              tempRainChartConfig[
                                props.dataKey as keyof ChartConfig
                              ];
                            if (typeof value === "number" && configEntry) {
                              if (props.dataKey === "temperature")
                                return [
                                  `${value.toFixed(1)} °C`,
                                  ` => ${configEntry.label}`,
                                ];
                              if (props.dataKey === "rainfall")
                                return [
                                  `${value.toFixed(0)}`,
                                  ` => ${configEntry.label}`,
                                ];
                            }
                            return [String(value), String(name)];
                          }}
                        />
                      }
                    />
                    {(detailTempRainMode === "temp_only" ||
                      detailTempRainMode === "both") &&
                      tempRainChartConfig.temperature && (
                        <Area
                          yAxisId="left"
                          dataKey="temperature"
                          type="monotone"
                          fill="url(#fillTempRingkasan)"
                          stroke={tempRainChartConfig.temperature.color}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{
                            r: 5,
                            strokeWidth: 1,
                            fill: "var(--background)",
                            stroke: tempRainChartConfig.temperature.color,
                          }}
                          connectNulls={true}
                          name={tempRainChartConfig.temperature.label.replace(
                            " : ",
                            ""
                          )}
                        />
                      )}
                    {(detailTempRainMode === "rain_only" ||
                      detailTempRainMode === "both") &&
                      tempRainChartConfig.rainfall && (
                        <Area
                          yAxisId={
                            detailTempRainMode === "both" ? "right" : "left"
                          }
                          dataKey="rainfall"
                          type="monotone"
                          fill="url(#fillRainRingkasan)"
                          stroke={tempRainChartConfig.rainfall.color}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{
                            r: 5,
                            strokeWidth: 1,
                            fill: "var(--background)",
                            stroke: tempRainChartConfig.rainfall.color,
                          }}
                          connectNulls={true}
                          name={tempRainChartConfig.rainfall.label.replace(
                            " : ",
                            ""
                          )}
                        />
                      )}
                    <RechartsLegend content={<ChartLegendContent />} />
                  </AreaChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-center p-4 text-muted-foreground">
                <Info className="w-6 h-6 mb-1" />
                <p className="text-xs">
                  Data grafik suhu/hujan tidak tersedia.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card ref={tdsChartRef}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Activity
                className="mr-2 h-5 w-5"
                style={{ color: tdsChartConfig.tdsPpm?.color || color3Var }}
              />
              Grafik TDS
            </CardTitle>
            <CardDescription className="text-xs">
              Tren TDS (Total Dissolved Solids) terkini (maks 60 data terakhir).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] p-0">
            {isLoadingSummaryHistory && summaryHistoricalData.length === 0 ? (
              <ChartContentSkeletonView />
            ) : summaryHistoricalData.length > 0 &&
              summaryHistoricalData.some((d) => d.tdsPpm != null) ? (
              <div className="px-2 pt-4 sm:px-4 h-full">
                <ChartContainer
                  config={tdsChartConfig as ShadCNChartConfig}
                  className="w-full h-full"
                >
                  <AreaChart
                    data={summaryHistoricalData}
                    margin={{ top: 5, right: 20, left: -10, bottom: 20 }}
                  >
                    <defs>
                      {tdsChartConfig.tdsPpm?.color && (
                        <linearGradient
                          id="fillTdsRingkasan"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={tdsChartConfig.tdsPpm.color}
                            stopOpacity={0.7}
                          />
                          <stop
                            offset="95%"
                            stopColor={tdsChartConfig.tdsPpm.color}
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      )}
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      strokeOpacity={0.5}
                    />
                    <XAxis
                      dataKey="timestampLabel"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={30}
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    {tdsChartConfig.tdsPpm && (
                      <YAxis
                        yAxisId="left"
                        dataKey="tdsPpm"
                        name={tdsChartConfig.tdsPpm.label.replace(" : ", "")}
                        stroke={tdsChartConfig.tdsPpm.color}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => `${v}ppm`}
                        domain={["auto", "auto"]}
                      />
                    )}
                    <RechartsTooltip
                      content={
                        <ChartTooltipContent
                          indicator="dot"
                          labelFormatter={(label, payload) =>
                            payload?.[0]
                              ? new Date(
                                  (
                                    payload[0]
                                      .payload as DevicePageChartDataPoint
                                  ).originalTimestamp
                                ).toLocaleString("id-ID", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })
                              : label
                          }
                          formatter={(value, name, props) => {
                            const configEntry =
                              tdsChartConfig[
                                props.dataKey as keyof ChartConfig
                              ];
                            if (typeof value === "number" && configEntry) {
                              if (props.dataKey === "tdsPpm")
                                return [
                                  `${value.toFixed(0)} ppm`,
                                  ` => ${configEntry.label}`,
                                ];
                            }
                            return [String(value), String(name)];
                          }}
                        />
                      }
                    />
                    {tdsChartConfig.tdsPpm && (
                      <Area
                        yAxisId="left"
                        dataKey="tdsPpm"
                        type="monotone"
                        fill="url(#fillTdsRingkasan)"
                        stroke={tdsChartConfig.tdsPpm.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{
                          r: 5,
                          strokeWidth: 1,
                          fill: "var(--background)",
                          stroke: tdsChartConfig.tdsPpm.color,
                        }}
                        connectNulls={true}
                        name={tdsChartConfig.tdsPpm.label.replace(" : ", "")}
                      />
                    )}
                    <RechartsLegend content={<ChartLegendContent />} />
                  </AreaChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-center p-4 text-muted-foreground">
                <Info className="w-6 h-6 mb-1" />
                <p className="text-xs">Data grafik TDS tidak tersedia.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card ref={turbidityChartRef}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Gauge
                className="mr-2 h-5 w-5"
                style={{
                  color: turbidityChartConfig.turbidityNtu?.color || color4Var,
                }}
              />
              Grafik Kekeruhan
            </CardTitle>
            <CardDescription className="text-xs">
              Tren Kekeruhan (Turbidity) terkini (maks 60 data terakhir).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] p-0">
            {isLoadingSummaryHistory && summaryHistoricalData.length === 0 ? (
              <ChartContentSkeletonView />
            ) : summaryHistoricalData.length > 0 &&
              summaryHistoricalData.some((d) => d.turbidityNtu != null) ? (
              <div className="px-2 pt-4 sm:px-4 h-full">
                <ChartContainer
                  config={turbidityChartConfig as ShadCNChartConfig}
                  className="w-full h-full"
                >
                  <AreaChart
                    data={summaryHistoricalData}
                    margin={{ top: 10, right: 20, left: -4, bottom: 20 }}
                  >
                    <defs>
                      {turbidityChartConfig.turbidityNtu?.color && (
                        <linearGradient
                          id="fillTurbidityRingkasan"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={turbidityChartConfig.turbidityNtu.color}
                            stopOpacity={0.7}
                          />
                          <stop
                            offset="95%"
                            stopColor={turbidityChartConfig.turbidityNtu.color}
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      )}
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      strokeOpacity={0.5}
                    />
                    <XAxis
                      dataKey="timestampLabel"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={30}
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    {turbidityChartConfig.turbidityNtu && (
                      <YAxis
                        yAxisId="left"
                        dataKey="turbidityNtu"
                        name={turbidityChartConfig.turbidityNtu.label.replace(
                          " : ",
                          ""
                        )}
                        stroke={turbidityChartConfig.turbidityNtu.color}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => `${v} NTU`}
                        domain={["auto", "auto"]}
                      />
                    )}
                    <RechartsTooltip
                      content={
                        <ChartTooltipContent
                          indicator="dot"
                          labelFormatter={(label, payload) =>
                            payload?.[0]
                              ? new Date(
                                  (
                                    payload[0]
                                      .payload as DevicePageChartDataPoint
                                  ).originalTimestamp
                                ).toLocaleString("id-ID", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })
                              : label
                          }
                          formatter={(value, name, props) => {
                            const configEntry =
                              turbidityChartConfig[
                                props.dataKey as keyof ChartConfig
                              ];
                            if (typeof value === "number" && configEntry) {
                              if (props.dataKey === "turbidityNtu")
                                return [
                                  `${value.toFixed(1)} NTU`,
                                  ` => ${configEntry.label}`,
                                ];
                            }
                            return [String(value), String(name)];
                          }}
                        />
                      }
                    />
                    {turbidityChartConfig.turbidityNtu && (
                      <Area
                        yAxisId="left"
                        dataKey="turbidityNtu"
                        type="monotone"
                        fill="url(#fillTurbidityRingkasan)"
                        stroke={turbidityChartConfig.turbidityNtu.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{
                          r: 5,
                          strokeWidth: 1,
                          fill: "var(--background)",
                          stroke: turbidityChartConfig.turbidityNtu.color,
                        }}
                        connectNulls={true}
                        name={turbidityChartConfig.turbidityNtu.label.replace(
                          " : ",
                          ""
                        )}
                      />
                    )}
                    <RechartsLegend content={<ChartLegendContent />} />
                  </AreaChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-center p-4 text-muted-foreground">
                <Info className="w-6 h-6 mb-1" />
                <p className="text-xs">Data grafik kekeruhan tidak tersedia.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
