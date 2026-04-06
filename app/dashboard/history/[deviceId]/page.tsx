// app/dashboard/history/[deviceId]/page.tsx
"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback, // ▼▼▼ Diubah
} from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { getBackendUrl } from "@/lib/demo/utils";
import { useSelectedDevice } from "../../../../contexts/SelectedDeviceContext";

import { SensorData } from "@/types/sensor"; // Asumsikan ini termasuk turbidity_ntu
import { getSocket } from "@/lib/socket";
import { Socket } from "socket.io-client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
  type ChartConfig as ShadCNChartConfig, // Impor tipe ChartConfig dari shadcn
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CalendarDays,
  SortAsc,
  Loader2,
  AlertTriangle,
  Info,
  Download,
  TestTube2, // Ikon untuk Kualitas Air (TDS & Kekeruhan)
  Thermometer, // Ikon untuk Suhu & Hujan
  Droplet, // Ikon untuk Ketinggian Air
  ShieldAlert, // ▼▼▼ Diubah: Impor ikon baru
} from "lucide-react";

import { DataTable } from "@/components/data-table"; // Pastikan path ini benar
import { columns as sensorDataColumnsDefinition } from "./columns";

import { addDays, format as formatDateFn } from "date-fns";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PaginationState } from "@tanstack/react-table"; // ▼▼▼ Impor baru

// ▼▼▼ Impor tipe data dan kolom untuk tabel alert ▼▼▼
import {
  AlertData,
  columns as alertHistoryColumnsDefinition,
} from "./alert-columns";

interface ChartDataPoint {
  timestampLabel: string;
  originalTimestamp: Date;
  waterLevel?: number | null;
  temperature?: number | null;
  rainfall?: number | null;
  tdsPpm?: number | null;
  turbidityNtu?: number | null; // Ditambahkan untuk kekeruhan
}

type ChartConfigValue = {
  label: string;
  color: string;
};
type ChartConfig = Record<string, ChartConfigValue>; // Ini akan digunakan secara konsisten

const ChartContentSkeleton = () => (
  <div className="px-2 pt-4 sm:px-6 sm:pt-6">
    <Skeleton className="h-[250px] sm:h-[350px] w-full rounded-md" />
  </div>
);

const TableContentSkeleton = () => (
  <div className="space-y-3 p-4">
    <Skeleton className="h-10 w-full rounded-md" />
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} className="h-12 w-full rounded-md" />
    ))}
  </div>
);

export default function DeviceHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const deviceIdFromUrl = params?.deviceId as string | undefined;
  const { data: session, status: sessionStatus } = useSession();
  const { setSelectedDeviceId, availableDevices } = useSelectedDevice();

  // State untuk data sensor
  const [historicalData, setHistoricalData] = useState<SensorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // ▼▼▼ State BARU untuk data alert ▼▼▼
  const [alertHistory, setAlertHistory] = useState<AlertData[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertPagination, setAlertPagination] = useState<PaginationState>({
    pageIndex: 0, // halaman dimulai dari 0
    pageSize: 10, // 10 item per halaman
  });
  const [alertTotalPages, setAlertTotalPages] = useState(0);

  const [alertTypeFilter, setAlertTypeFilter] = useState<string>("all");
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<string>("all");
  const [alertStatusFilter, setAlertStatusFilter] = useState<string>("all");

  // State lain yang sudah ada
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">(
    "7d"
  );
  const [exportDateRange, setExportDateRange] = React.useState<
    DateRange | undefined
  >({
    from: addDays(new Date(), -7),
    to: new Date(),
  });
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const backendUrl = getBackendUrl();

  const deviceName = useMemo(() => {
    if (!deviceIdFromUrl) return undefined;
    const device = availableDevices.find(
      (d) => d.device_id === deviceIdFromUrl
    );
    return device?.name || deviceIdFromUrl;
  }, [deviceIdFromUrl, availableDevices]);

  type TempRainDisplayMode = "temp_only" | "rain_only" | "both";
  const [tempRainMode, setTempRainMode] = useState<TempRainDisplayMode>("both");

  type TdsTurbidityDisplayMode = "tds_only" | "turbidity_only" | "both";
  const [tdsTurbidityMode, setTdsTurbidityMode] =
    useState<TdsTurbidityDisplayMode>("both");

  // ▼▼▼ Fungsi BARU untuk fetch data riwayat alert ▼▼▼
  const fetchAlertHistory = useCallback(async () => {
    // Pengecekan awal tetap sama
    if (
      !deviceIdFromUrl ||
      sessionStatus !== "authenticated" ||
      !backendUrl ||
      !timeRange ||
      !session?.user?.backendToken
    )
      return;

    setIsLoadingAlerts(true);
    setAlertError(null);
    try {
      const { pageIndex, pageSize } = alertPagination;
      const url = new URL(`${backendUrl}/api/alerts/${deviceIdFromUrl}`);
      url.searchParams.append("page", String(pageIndex + 1));
      url.searchParams.append("limit", String(pageSize));
      url.searchParams.append("timeRange", timeRange);

      // ▼▼▼ TAMBAHKAN FILTER BARU KE URL JIKA BUKAN "ALL" ▼▼▼
      if (alertTypeFilter !== "all") {
        url.searchParams.append("alertType", alertTypeFilter);
      }
      if (alertSeverityFilter !== "all") {
        url.searchParams.append("severity", alertSeverityFilter);
      }
      if (alertStatusFilter !== "all") {
        url.searchParams.append("isActive", alertStatusFilter);
      }

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${session.user.backendToken}` },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Gagal mengambil riwayat alert.");
      }

      const result = await response.json();
      setAlertHistory(result.data);
      setAlertTotalPages(result.pagination?.totalPages ?? result.totalPages ?? 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setAlertError(message);
      setAlertHistory([]);
    } finally {
      setIsLoadingAlerts(false);
    }
  }, [
    deviceIdFromUrl,
    sessionStatus,
    backendUrl,
    session?.user,
    alertPagination,
    timeRange,
    // ▼▼▼ TAMBAHKAN DEPENDENSI BARU ▼▼▼
    alertTypeFilter,
    alertSeverityFilter,
    alertStatusFilter,
  ]);

  // useEffect yang memanggil fetchAlertHistory tidak perlu diubah
  useEffect(() => {
    fetchAlertHistory();
  }, [fetchAlertHistory]);

  // Perbarui juga useEffect yang mereset paginasi
  useEffect(() => {
    // Reset ke halaman pertama setiap kali filter utama berubah
    setAlertPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [
    timeRange,
    // ▼▼▼ TAMBAHKAN DEPENDENSI BARU ▼▼▼
    alertTypeFilter,
    alertSeverityFilter,
    alertStatusFilter,
  ]);

  useEffect(() => {
    if (deviceIdFromUrl) {
      setSelectedDeviceId(deviceIdFromUrl, { navigate: false });
    } else if (sessionStatus !== "loading" && initialLoading) {
      setError("Device ID tidak ditemukan di URL.");
      setIsLoading(false);
      setInitialLoading(false);
    }
  }, [deviceIdFromUrl, setSelectedDeviceId, sessionStatus, initialLoading]);
  useEffect(() => {
    // Reset ke halaman pertama setiap kali timeRange atau sortOrder (jika ada) berubah
    setAlertPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [timeRange]);

  // ▼▼▼ useEffect BARU untuk memanggil fetchAlertHistory ▼▼▼
  useEffect(() => {
    fetchAlertHistory();
  }, [fetchAlertHistory]); // Akan terpanggil saat deviceId, sesi, atau paginasi berubah

  useEffect(() => {
    if (
      deviceName !== undefined ||
      (deviceIdFromUrl &&
        !availableDevices.length &&
        sessionStatus !== "loading")
    ) {
      if (initialLoading) setInitialLoading(false);
    }
  }, [
    deviceName,
    deviceIdFromUrl,
    availableDevices,
    initialLoading,
    sessionStatus,
  ]);

  useEffect(() => {
    if (
      initialLoading ||
      !deviceIdFromUrl ||
      sessionStatus !== "authenticated" ||
      !session?.user?.backendToken ||
      !backendUrl
    ) {
      return;
    }
    setIsLoading(true);
    setError(null);
    const limit = timeRange === "all" ? 0 : 2000;
    const fetchUrl = `${backendUrl}/api/sensor-data/history/${deviceIdFromUrl}?sortOrder=${sortOrder}&timeRange=${timeRange}&limit=${limit}`;

    fetch(fetchUrl, {
      headers: { Authorization: `Bearer ${session.user.backendToken}` },
    })
      .then((res) => {
        if (!res.ok) {
          return res
            .json()
            .then((errData) => {
              throw new Error(
                (errData as { message?: string })?.message ||
                  `Gagal mengambil data riwayat (${res.status})`
              );
            })
            .catch(() => {
              throw new Error(`Gagal mengambil data riwayat (${res.status})`);
            });
        }
        return res.json() as Promise<SensorData[]>;
      })
      .then((data) => {
        setHistoricalData(data);
      })
      .catch((err) => {
        console.error("Fetch history error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat mengambil data."
        );
        setHistoricalData([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [
    deviceIdFromUrl,
    sortOrder,
    timeRange,
    sessionStatus,
    session?.user?.backendToken,
    backendUrl,
    initialLoading,
  ]);

  useEffect(() => {
    if (
      !deviceIdFromUrl ||
      sessionStatus !== "authenticated" ||
      !backendUrl ||
      !session?.user?.backendToken
    ) {
      return;
    }
    const socket: Socket = getSocket(backendUrl, session.user.backendToken);
    if (!socket.connected) socket.connect();

    const onNewSensorData = (data: SensorData) => {
      if (data.device_id !== deviceIdFromUrl) return;
      setHistoricalData((prev) => {
        const newDataPoint = data;
        const updatedData =
          sortOrder === "ASC"
            ? [...prev, newDataPoint]
            : [newDataPoint, ...prev];
        const maxDataPoints = timeRange === "all" ? 10000 : 2000;
        if (updatedData.length > maxDataPoints) {
          return sortOrder === "ASC"
            ? updatedData.slice(-maxDataPoints)
            : updatedData.slice(0, maxDataPoints);
        }
        return updatedData;
      });
    };
    socket.on("new_sensor_data", onNewSensorData);
    return () => {
      socket.off("new_sensor_data", onNewSensorData);
    };
  }, [
    deviceIdFromUrl,
    sortOrder,
    timeRange,
    sessionStatus,
    backendUrl,
    session?.user?.backendToken,
  ]);

  const chartData = useMemo((): ChartDataPoint[] => {
    return historicalData.map((d) => ({
      timestampLabel: new Date(d.timestamp).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      originalTimestamp: new Date(d.timestamp),
      waterLevel: d.water_level_cm != null ? Number(d.water_level_cm) : null,
      temperature: d.temperature_c != null ? Number(d.temperature_c) : null,
      rainfall:
        d.rainfall_value_raw != null ? Number(d.rainfall_value_raw) : null,
      tdsPpm: d.tds_ppm != null ? Number(d.tds_ppm) : null,
      turbidityNtu: d.turbidity_ntu != null ? Number(d.turbidity_ntu) : null, // Map turbidity
    }));
  }, [historicalData]);

  const color1 = `var(--chart-1)`;
  const color2 = `var(--chart-2)`;
  const color3 = `var(--chart-3)`; // Untuk TDS
  const color4 = `var(--chart-4)`; // Untuk Kekeruhan

  const waterLevelChartConfig = useMemo(
    (): ChartConfig => ({
      waterLevel: { label: "Ketinggian Air (cm)", color: color1 },
    }),
    [color1]
  );
  const tempRainChartConfig = useMemo((): ChartConfig => {
    const config: ChartConfig = {};
    if (tempRainMode === "temp_only" || tempRainMode === "both")
      config.temperature = { label: "Suhu (°C)", color: color1 };
    if (tempRainMode === "rain_only" || tempRainMode === "both")
      config.rainfall = { label: "Curah Hujan (Raw)", color: color2 };
    return config;
  }, [tempRainMode, color1, color2]);

  // Konfigurasi chart baru untuk TDS & Kekeruhan
  const tdsTurbidityChartConfig = useMemo((): ChartConfig => {
    const config: ChartConfig = {};
    if (tdsTurbidityMode === "tds_only" || tdsTurbidityMode === "both")
      config.tdsPpm = { label: "TDS (ppm)", color: color3 };
    if (tdsTurbidityMode === "turbidity_only" || tdsTurbidityMode === "both")
      config.turbidityNtu = { label: "Kekeruhan (NTU)", color: color4 };
    return config;
  }, [tdsTurbidityMode, color3, color4]);

  const columnsToDisplay = useMemo(() => {
    return sensorDataColumnsDefinition.filter((column) => {
      const columnId =
        column.id || (column as { accessorKey?: string }).accessorKey;
      return columnId !== "ph_value";
    });
  }, []);

  const convertToCSV = (jsonData: SensorData[]): string => {
    if (!jsonData || jsonData.length === 0) return "";
    const headers = [
      "Timestamp",
      "Ketinggian Air (cm)",
      "Suhu Air (°C)",
      "Kekeruhan (NTU)", // Pastikan ini ada
      "TDS (ppm)", // Pastikan ini ada
      "Data Curah Hujan (Raw)",
      "Jarak Sensor (cm)",
    ];
    const csvRows = [headers.join(",")];
    jsonData.forEach((row) => {
      const formattedTimestamp = row.timestamp
        ? new Date(row.timestamp)
            .toLocaleString("id-ID", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })
            .replace(/\./g, ":")
        : "N/A";
      const values = [
        `"${formattedTimestamp}"`,
        row.water_level_cm ?? "",
        row.temperature_c ?? "",
        row.turbidity_ntu ?? "", // Tambahkan data kekeruhan
        row.tds_ppm ?? "",
        row.rainfall_value_raw ?? "",
        row.raw_distance_cm ?? "",
      ];
      csvRows.push(values.join(","));
    });
    return csvRows.join("\n");
  };

  const downloadCSV = (
    csvContent: string,
    baseFilename: string,
    dateRange: DateRange | undefined
  ) => {
    if (!dateRange) return;
    const fromDateStr = dateRange.from
      ? formatDateFn(dateRange.from, "yyyyMMdd")
      : "alltime";
    const toDateStr = dateRange.to
      ? formatDateFn(dateRange.to, "yyyyMMdd")
      : "";
    const filename = `${baseFilename}_${fromDateStr}${
      toDateStr ? "-" + toDateStr : ""
    }.csv`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleExportToCSV = async () => {
    if (
      !deviceIdFromUrl ||
      !exportDateRange?.from ||
      !exportDateRange?.to ||
      !session?.user?.backendToken ||
      !backendUrl
    ) {
      toast.error("Gagal Ekspor", {
        description:
          "Rentang tanggal, ID perangkat, atau konfigurasi server tidak valid.",
      });
      return;
    }
    setIsExporting(true);
    toast.info("Memulai Ekspor", {
      description: "Sedang mengambil data untuk CSV...",
    });
    try {
      const startDate = formatDateFn(exportDateRange.from, "yyyy-MM-dd");
      const endDate = formatDateFn(exportDateRange.to, "yyyy-MM-dd");
      const exportUrl = `${backendUrl}/api/sensor-data/history/${deviceIdFromUrl}?sortOrder=ASC&startDate=${startDate}&endDate=${endDate}&limit=0`;
      const response = await fetch(exportUrl, {
        headers: { Authorization: `Bearer ${session.user.backendToken}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { message?: string })?.message ||
            `Gagal mengambil data untuk ekspor (${response.status})`
        );
      }
      const dataToExport: SensorData[] = await response.json();
      if (dataToExport.length === 0) {
        toast.info("Tidak Ada Data", {
          description:
            "Tidak ada data ditemukan untuk rentang tanggal yang dipilih.",
        });
        setIsExporting(false);
        return;
      }
      const csvContent = convertToCSV(dataToExport);
      downloadCSV(
        csvContent,
        `riwayat_sensor_${deviceIdFromUrl}`,
        exportDateRange
      );
      toast.success("Ekspor Berhasil", {
        description: `Data CSV telah diunduh.`,
      });
    } catch (err) {
      console.error("Error exporting to CSV:", err);
      toast.error("Gagal Ekspor CSV", {
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (
    initialLoading ||
    (sessionStatus === "loading" && deviceName === undefined)
  ) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6 animate-pulse">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <Skeleton className="h-8 w-48 mb-2 rounded-md" />
            <Skeleton className="h-10 w-72 rounded-md" />
          </div>
        </div>
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-x-4 gap-y-2 border-b pb-3 pt-4 px-4">
            <div className="flex-grow space-y-2">
              <Skeleton className="h-6 w-1/2 rounded-md" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
            </div>
            <div className="flex gap-2 flex-shrink-0 flex-wrap w-full sm:w-auto">
              <Skeleton className="h-9 w-28 rounded-md" />
              <Skeleton className="h-9 w-36 rounded-md" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pt-3 pb-4 space-y-3">
            <Skeleton className="h-5 w-1/3 rounded-md" />
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <Skeleton className="h-9 w-full sm:w-72 rounded-md" />
              <Skeleton className="h-9 w-full sm:w-28 rounded-md" />
            </div>
          </CardContent>
        </Card>
        {[...Array(3)].map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-6 w-1/2 mb-1 rounded-md" />
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
              <Skeleton className="h-[250px] sm:h-[350px] w-full rounded-md" />
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2 mb-1 rounded-md" />
            <Skeleton className="h-4 w-3/4 rounded-md" />
          </CardHeader>
          <CardContent>
            <TableContentSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!deviceIdFromUrl && !initialLoading) {
    return (
      <div className="container mx-auto p-6 text-center min-h-screen flex flex-col justify-center items-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <p className="text-destructive font-semibold">Device ID Tidak Valid</p>
        <p className="text-muted-foreground mb-4">
          {error || "Device ID tidak ditemukan di URL."}
        </p>
        <Button onClick={() => router.push(`/dashboard/all`)} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dashboard
        </Button>
      </div>
    );
  }
  if (error && historicalData.length === 0 && !isLoading && !initialLoading) {
    return (
      <div className="container mx-auto p-6 text-center min-h-screen flex flex-col justify-center items-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <p className="text-destructive font-semibold">Gagal Memuat Riwayat</p>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button
          onClick={() =>
            router.push(
              deviceIdFromUrl
                ? `/dashboard/device/${deviceIdFromUrl}`
                : "/dashboard/all"
            )
          }
          variant="outline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pb-4 lg:px-6 lg:pb-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <Button
            onClick={() =>
              router.push(
                deviceIdFromUrl
                  ? `/dashboard/device/${deviceIdFromUrl}`
                  : "/dashboard/all"
              )
            }
            size="sm"
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Detail Perangkat
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            {deviceName || (
              <Skeleton className="h-8 w-48 inline-block rounded-md align-bottom" />
            )}
          </h1>
        </div>
      </div>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-x-4 gap-y-2 border-b pb-3 pt-4 px-4">
          <div className="flex-grow">
            <CardTitle className="text-lg">Filter & Opsi Data</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Pilih rentang waktu, urutan data, dan opsi ekspor.{" "}
              <br className="sm:hidden" />
              Menampilkan{" "}
              {isLoading && historicalData.length === 0 && !error ? (
                <Skeleton className="h-4 w-10 inline-block rounded-md" />
              ) : (
                historicalData.length
              )}{" "}
              titik data.
              {isLoading && historicalData.length > 0 && (
                <Loader2 className="inline-block ml-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-wrap w-full sm:w-auto">
            <Select
              value={timeRange}
              onValueChange={(value) => setTimeRange(value as typeof timeRange)}
            >
              <SelectTrigger className="w-full flex-1 sm:w-[120px] text-xs h-9">
                <CalendarDays className="h-3.5 w-3.5 opacity-80" />
                <SelectValue placeholder="Rentang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 Hari</SelectItem>
                <SelectItem value="30d">30 Hari</SelectItem>
                <SelectItem value="90d">90 Hari</SelectItem>
                <SelectItem value="all">Semua</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sortOrder}
              onValueChange={(value) => setSortOrder(value as typeof sortOrder)}
            >
              <SelectTrigger className="w-full flex-1 sm:w-[140px] text-xs h-9">
                <SortAsc className="mr-1.5 h-3.5 w-3.5 opacity-80" />
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ASC">Asc</SelectItem>
                <SelectItem value="DESC">Desc</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-4 pt-3 pb-4">
          <div className="text-sm font-medium mb-2">Ekspor Data ke CSV:</div>
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  className={`w-full sm:w-[280px] justify-start text-left font-normal h-9 text-xs ${
                    !exportDateRange && "text-muted-foreground"
                  }`}
                >
                  <CalendarDays className="mr-2 h-4 w-auto" />
                  {exportDateRange?.from ? (
                    exportDateRange.to ? (
                      <>
                        {" "}
                        {formatDateFn(exportDateRange.from, "LLL dd, y")} -{" "}
                        {formatDateFn(exportDateRange.to, "LLL dd, y")}{" "}
                      </>
                    ) : (
                      formatDateFn(exportDateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pilih rentang tanggal</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={exportDateRange?.from}
                  selected={exportDateRange}
                  onSelect={setExportDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <Button
              onClick={handleExportToCSV}
              disabled={
                isExporting || !exportDateRange?.from || !exportDateRange?.to
              }
              className="w-full sm:w-auto h-9 text-xs align-center justify-center"
              size="sm"
            >
              {isExporting ? (
                <Loader2 className=" h-auto w-4 animate-spin" />
              ) : (
                <Download className=" h-auto w-4" />
              )}
            </Button>
          </div>
          {isExporting && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              {" "}
              Sedang mempersiapkan dan mengunduh data...{" "}
            </p>
          )}
        </CardContent>
      </Card>

      {/* --- CHART 1: KETINGGIAN AIR --- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Droplet
              className="mr-2 h-5 w-5"
              style={{ color: waterLevelChartConfig.waterLevel?.color }}
            />
            Grafik Ketinggian Air
          </CardTitle>
          <CardDescription>
            Menampilkan riwayat data ketinggian air.
            {timeRange !== "all" &&
              ` Rentang: ${
                timeRange === "7d"
                  ? "7 Hari"
                  : timeRange === "30d"
                  ? "30 Hari"
                  : "90 Hari"
              }.`}
            Urutan: {sortOrder === "ASC" ? "Lama→Baru" : "Baru→Lama"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && chartData.length === 0 && !error ? (
            <ChartContentSkeleton />
          ) : chartData.length > 0 &&
            chartData.some((d) => d.waterLevel != null) ? (
            <div className="px-2 pt-4 sm:px-6 sm:pt-6">
              <ChartContainer
                config={waterLevelChartConfig as ShadCNChartConfig}
                className="h-[250px] sm:h-[350px] w-full"
              >
                <AreaChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: -20, bottom: 20 }}
                >
                  <defs>
                    {waterLevelChartConfig.waterLevel?.color && (
                      <linearGradient
                        id="fillWaterLevel"
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
                    name={waterLevelChartConfig.waterLevel?.label}
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
                                  payload[0].payload as ChartDataPoint
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
                              `${value.toFixed(0)} cm`,
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
                      fill="url(#fillWaterLevel)"
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
                      name={waterLevelChartConfig.waterLevel.label
                        .replace("|", "")
                        .trim()}
                    />
                  )}
                  <RechartsLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </div>
          ) : (
            <div className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col items-center justify-center h-[calc(250px+2rem)] sm:h-[calc(350px+3rem)] text-muted-foreground">
              <Info className="w-8 h-8 mb-2" />
              <span className="text-center">
                Data ketinggian air tidak tersedia.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- CHART 2: SUHU & CURAH HUJAN --- */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle className="text-lg flex items-center">
                <Thermometer
                  className="mr-2 h-5 w-5"
                  style={{
                    color: tempRainChartConfig.temperature?.color || color1,
                  }}
                />
                Grafik Suhu & Curah Hujan
              </CardTitle>
              <CardDescription>
                Pilih data yang ingin ditampilkan.
              </CardDescription>
            </div>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={tempRainMode}
              onValueChange={(value: string) => {
                if (value) setTempRainMode(value as TempRainDisplayMode);
              }}
              className="mt-2 sm:mt-0"
            >
              <ToggleGroupItem value="temp_only" aria-label="Hanya Suhu">
                Suhu
              </ToggleGroupItem>
              <ToggleGroupItem value="rain_only" aria-label="Hanya Curah Hujan">
                Hujan
              </ToggleGroupItem>
              <ToggleGroupItem
                value="both"
                aria-label="Suhu dan Curah Hujan"
                className="px-5"
              >
                Keduanya
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && chartData.length === 0 && !error ? (
            <ChartContentSkeleton />
          ) : chartData.length > 0 &&
            chartData.some(
              (d) =>
                (tempRainMode === "temp_only" || tempRainMode === "both"
                  ? d.temperature != null
                  : false) ||
                (tempRainMode === "rain_only" || tempRainMode === "both"
                  ? d.rainfall != null
                  : false)
            ) ? (
            <div className="px-2 pt-4 sm:px-6 sm:pt-6">
              <ChartContainer
                config={tempRainChartConfig as ShadCNChartConfig}
                className="h-[250px] sm:h-[350px] w-full"
              >
                <AreaChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: tempRainMode === "both" ? -27 : 10,
                    left: tempRainMode === "both" ? -17 : -17,
                    bottom: 20,
                  }}
                >
                  <defs>
                    {(tempRainMode === "temp_only" ||
                      tempRainMode === "both") &&
                      tempRainChartConfig.temperature?.color && (
                        <linearGradient
                          id="fillTempChart2"
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
                    {(tempRainMode === "rain_only" ||
                      tempRainMode === "both") &&
                      tempRainChartConfig.rainfall?.color && (
                        <linearGradient
                          id="fillRainChart2"
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
                  {(tempRainMode === "temp_only" || tempRainMode === "both") &&
                    tempRainChartConfig.temperature && (
                      <YAxis
                        yAxisId="left"
                        dataKey="temperature"
                        name={tempRainChartConfig.temperature.label}
                        stroke={tempRainChartConfig.temperature.color}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) =>
                          `${Number(value).toFixed(1)}°C`
                        }
                        domain={["auto", "auto"]}
                      />
                    )}
                  {tempRainMode === "rain_only" &&
                    tempRainChartConfig.rainfall && (
                      <YAxis
                        yAxisId="left" // Use left if only rain is shown
                        dataKey="rainfall"
                        name={tempRainChartConfig.rainfall.label}
                        stroke={tempRainChartConfig.rainfall.color}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => `${value}`}
                        domain={["auto", "auto"]}
                        allowDecimals={false}
                      />
                    )}
                  {tempRainMode === "both" && tempRainChartConfig.rainfall && (
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      dataKey="rainfall"
                      name={tempRainChartConfig.rainfall.label}
                      stroke={tempRainChartConfig.rainfall.color}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => `${value}`}
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
                                  payload[0].payload as ChartDataPoint
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
                  {(tempRainMode === "temp_only" || tempRainMode === "both") &&
                    tempRainChartConfig.temperature && (
                      <Area
                        yAxisId="left"
                        dataKey="temperature"
                        type="monotone"
                        fill="url(#fillTempChart2)"
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
                        name={tempRainChartConfig.temperature.label
                          .replace("|", "")
                          .trim()}
                      />
                    )}
                  {(tempRainMode === "rain_only" || tempRainMode === "both") &&
                    tempRainChartConfig.rainfall && (
                      <Area
                        yAxisId={
                          tempRainMode === "rain_only" ? "left" : "right"
                        }
                        dataKey="rainfall"
                        type="monotone"
                        fill="url(#fillRainChart2)"
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
                        name={tempRainChartConfig.rainfall.label
                          .replace("|", "")
                          .trim()}
                      />
                    )}
                  <RechartsLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </div>
          ) : (
            <div className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col items-center justify-center h-[calc(250px+2rem)] sm:h-[calc(350px+3rem)] text-muted-foreground">
              <Info className="w-8 h-8 mb-2" />
              <span className="text-center">
                Data suhu/curah hujan tidak tersedia.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- CHART 3: TDS & KEKERUHAN --- */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle className="text-lg flex items-center">
                <TestTube2
                  className="mr-2 h-5 w-5"
                  style={{
                    color: tdsTurbidityChartConfig.tdsPpm?.color || color3,
                  }}
                />
                Grafik Kualitas Air (TDS & Kekeruhan)
              </CardTitle>
              <CardDescription>
                Pilih data kualitas air yang ingin ditampilkan.
              </CardDescription>
            </div>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={tdsTurbidityMode}
              onValueChange={(value: string) => {
                if (value)
                  setTdsTurbidityMode(value as TdsTurbidityDisplayMode);
              }}
              className="mt-2 sm:mt-0"
            >
              <ToggleGroupItem value="tds_only" aria-label="Hanya TDS">
                TDS
              </ToggleGroupItem>
              <ToggleGroupItem
                value="turbidity_only"
                aria-label="Hanya Kekeruhan"
                className="px-5"
              >
                Kekeruhan
              </ToggleGroupItem>
              <ToggleGroupItem
                value="both"
                aria-label="TDS dan Kekeruhan"
                className="px-5"
              >
                Keduanya
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && chartData.length === 0 && !error ? (
            <ChartContentSkeleton />
          ) : chartData.length > 0 &&
            chartData.some(
              (d) =>
                (tdsTurbidityMode === "tds_only" || tdsTurbidityMode === "both"
                  ? d.tdsPpm != null
                  : false) ||
                (tdsTurbidityMode === "turbidity_only" ||
                tdsTurbidityMode === "both"
                  ? d.turbidityNtu != null
                  : false)
            ) ? (
            <div className="px-2 pt-4 sm:px-6 sm:pt-6">
              <ChartContainer
                config={tdsTurbidityChartConfig as ShadCNChartConfig}
                className="h-[250px] sm:h-[350px] w-full"
              >
                <AreaChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: tdsTurbidityMode === "both" ? 5 : 10,
                    left: tdsTurbidityMode === "both" ? -8 : 10,
                    bottom: 20,
                  }}
                >
                  <defs>
                    {(tdsTurbidityMode === "tds_only" ||
                      tdsTurbidityMode === "both") &&
                      tdsTurbidityChartConfig.tdsPpm?.color && (
                        <linearGradient
                          id="fillTdsChartCombined"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={tdsTurbidityChartConfig.tdsPpm.color}
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor={tdsTurbidityChartConfig.tdsPpm.color}
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      )}
                    {(tdsTurbidityMode === "turbidity_only" ||
                      tdsTurbidityMode === "both") &&
                      tdsTurbidityChartConfig.turbidityNtu?.color && (
                        <linearGradient
                          id="fillTurbidityChartCombined"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={
                              tdsTurbidityChartConfig.turbidityNtu.color
                            }
                            stopOpacity={0.7}
                          />
                          <stop
                            offset="95%"
                            stopColor={
                              tdsTurbidityChartConfig.turbidityNtu.color
                            }
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
                  {(tdsTurbidityMode === "tds_only" ||
                    tdsTurbidityMode === "both") &&
                    tdsTurbidityChartConfig.tdsPpm && (
                      <YAxis
                        yAxisId="left"
                        dataKey="tdsPpm"
                        name={tdsTurbidityChartConfig.tdsPpm.label}
                        stroke={tdsTurbidityChartConfig.tdsPpm.color}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) =>
                          `${Number(value).toFixed(0)}ppm`
                        }
                        domain={["auto", "auto"]}
                      />
                    )}
                  {tdsTurbidityMode === "turbidity_only" &&
                    tdsTurbidityChartConfig.turbidityNtu && (
                      <YAxis
                        yAxisId="left"
                        dataKey="turbidityNtu"
                        name={tdsTurbidityChartConfig.turbidityNtu.label}
                        stroke={tdsTurbidityChartConfig.turbidityNtu.color}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) =>
                          `${Number(value).toFixed(1)}NTU`
                        }
                        domain={["auto", "auto"]}
                      />
                    )}
                  {tdsTurbidityMode === "both" &&
                    tdsTurbidityChartConfig.turbidityNtu && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        dataKey="turbidityNtu"
                        name={tdsTurbidityChartConfig.turbidityNtu.label}
                        stroke={tdsTurbidityChartConfig.turbidityNtu.color}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) =>
                          `${Number(value).toFixed(1)}NTU`
                        }
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
                                  payload[0].payload as ChartDataPoint
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
                            tdsTurbidityChartConfig[
                              props.dataKey as keyof ChartConfig
                            ];
                          if (typeof value === "number" && configEntry) {
                            if (props.dataKey === "tdsPpm")
                              return [
                                `${value.toFixed(0)} ppm`,
                                ` => ${configEntry.label}`,
                              ];
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
                  {(tdsTurbidityMode === "tds_only" ||
                    tdsTurbidityMode === "both") &&
                    tdsTurbidityChartConfig.tdsPpm && (
                      <Area
                        yAxisId="left"
                        dataKey="tdsPpm"
                        type="monotone"
                        fill="url(#fillTdsChartCombined)"
                        stroke={tdsTurbidityChartConfig.tdsPpm.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{
                          r: 5,
                          strokeWidth: 1,
                          fill: "var(--background)",
                          stroke: tdsTurbidityChartConfig.tdsPpm.color,
                        }}
                        connectNulls={true}
                        name={tdsTurbidityChartConfig.tdsPpm.label
                          .replace("|", "")
                          .trim()}
                      />
                    )}
                  {(tdsTurbidityMode === "turbidity_only" ||
                    tdsTurbidityMode === "both") &&
                    tdsTurbidityChartConfig.turbidityNtu && (
                      <Area
                        yAxisId={
                          tdsTurbidityMode === "turbidity_only"
                            ? "left"
                            : "right"
                        }
                        dataKey="turbidityNtu"
                        type="monotone"
                        fill="url(#fillTurbidityChartCombined)"
                        stroke={tdsTurbidityChartConfig.turbidityNtu.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{
                          r: 5,
                          strokeWidth: 1,
                          fill: "var(--background)",
                          stroke: tdsTurbidityChartConfig.turbidityNtu.color,
                        }}
                        connectNulls={true}
                        name={tdsTurbidityChartConfig.turbidityNtu.label
                          .replace("|", "")
                          .trim()}
                      />
                    )}
                  <RechartsLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </div>
          ) : (
            <div className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col items-center justify-center h-[calc(250px+2rem)] sm:h-[calc(350px+3rem)] text-muted-foreground">
              <Info className="w-8 h-8 mb-2" />
              <span className="text-center">
                Data TDS atau Kekeruhan tidak tersedia.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- TABEL RIWAYAT SENSOR --- */}
      <Card>
        <CardHeader>
          <CardTitle>Data Tabel Riwayat Sensor</CardTitle>
          <CardDescription>
            Detail data sensor historis untuk perangkat {deviceName || "ini"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && historicalData.length === 0 && !error ? (
            <TableContentSkeleton />
          ) : !isLoading && error && historicalData.length === 0 ? (
            <div className="p-4 flex flex-col items-center justify-center py-10 text-destructive">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p className="font-semibold">Gagal memuat data tabel.</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : historicalData.length > 0 ? (
            <div className="overflow-x-auto p-2 sm:p-4">
              <DataTable columns={columnsToDisplay} data={historicalData} />
            </div>
          ) : (
            <div className="p-4 flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Info className="w-8 h-8 mb-2" />
              <span>Tidak ada data tabel untuk ditampilkan.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ▼▼▼ KARTU BARU UNTUK RIWAYAT ALERT ▼▼▼ */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center">
                <ShieldAlert className="mr-2 h-5 w-5 text-red-500" />
                Riwayat Alert Perangkat
              </CardTitle>
              <CardDescription>
                Filter dan lihat semua alert yang pernah tercatat untuk
                perangkat ini.
              </CardDescription>
            </div>
            {/* Filter Dropdowns */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select
                value={alertTypeFilter}
                onValueChange={setAlertTypeFilter}
              >
                <SelectTrigger className="w-full sm:w-[150px] text-xs h-9">
                  <SelectValue placeholder="Tipe Alert" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="flood">Banjir</SelectItem>
                  <SelectItem value="rapid_rise">Kenaikan Cepat</SelectItem>
                  <SelectItem value="critical_water_quality">
                    Kualitas Air
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={alertSeverityFilter}
                onValueChange={setAlertSeverityFilter}
              >
                <SelectTrigger className="w-full sm:w-[120px] text-xs h-9">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Level</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={alertStatusFilter}
                onValueChange={setAlertStatusFilter}
              >
                <SelectTrigger className="w-full sm:w-[120px] text-xs h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="true">Aktif</SelectItem>
                  <SelectItem value="false">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingAlerts && alertHistory.length === 0 ? (
            <TableContentSkeleton />
          ) : alertError ? (
            <div className="p-4 flex flex-col items-center justify-center py-10 text-destructive">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p className="font-semibold">Gagal memuat riwayat alert.</p>
              <p className="text-sm">{alertError}</p>
            </div>
          ) : (
            <div className="overflow-x-auto p-2 sm:p-4">
              <DataTable
                columns={alertHistoryColumnsDefinition}
                data={alertHistory}
                pageCount={alertTotalPages}
                pagination={alertPagination}
                onPaginationChange={setAlertPagination}
                defaultSortColumnId="alert_triggered_at"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
