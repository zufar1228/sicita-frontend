"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/hooks/useSession";
import { getBackendUrl } from "@/lib/demo/utils";
import { PaginationState } from "@tanstack/react-table";
import { useSelectedDevice } from "../../../../contexts/SelectedDeviceContext";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import {
  AlertTriangle,
  History,
  Calendar as CalendarIcon,
  FilterX,
} from "lucide-react";

import { AlertHistoryData, columns as alertHistoryColumns } from "./columns";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function AllHistoryPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { availableDevices } = useSelectedDevice();

  const [alerts, setAlerts] = useState<AlertHistoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [pageCount, setPageCount] = useState(0);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("all");
  const [alertTypeFilter, setAlertTypeFilter] = useState<string>("all");
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<string>("all");
  const [alertStatusFilter, setAlertStatusFilter] = useState<string>("all");

  const backendUrl = getBackendUrl();

  const fetchAlerts = useCallback(async () => {
    if (
      sessionStatus !== "authenticated" ||
      !session?.user?.backendToken ||
      !backendUrl
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { pageIndex, pageSize } = pagination;
      const url = new URL(`${backendUrl}/api/alerts`);
      url.searchParams.append("page", String(pageIndex + 1));
      url.searchParams.append("limit", String(pageSize));

      // ▼▼▼ LOGIKA TANGGAL YANG DIPERBAIKI ▼▼▼
      if (dateRange?.from) {
        // Kirim tanggal mulai seperti biasa
        url.searchParams.append(
          "startDate",
          format(dateRange.from, "yyyy-MM-dd")
        );
      }
      if (dateRange?.to) {
        // Tambahkan 1 hari ke tanggal akhir agar inklusif
        const inclusiveEndDate = addDays(dateRange.to, 1);
        url.searchParams.append(
          "endDate",
          format(inclusiveEndDate, "yyyy-MM-dd")
        );
      }

      if (selectedDeviceId !== "all") {
        url.searchParams.append("deviceId", selectedDeviceId);
      }
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
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.message || "Gagal mengambil riwayat peringatan."
        );
      }

      const result = await response.json();
      setAlerts(result.data);
      setPageCount(result.pagination?.totalPages ?? result.totalPages ?? 0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan tidak diketahui."
      );
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    sessionStatus,
    session?.user,
    pagination,
    backendUrl,
    dateRange,
    selectedDeviceId,
    alertTypeFilter,
    alertSeverityFilter,
    alertStatusFilter,
  ]);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchAlerts();
    }
  }, [fetchAlerts, sessionStatus]);

  useEffect(() => {
    setPagination((currentPagination) => {
      if (currentPagination.pageIndex === 0) {
        return currentPagination;
      }
      return { ...currentPagination, pageIndex: 0 };
    });
  }, [
    dateRange,
    selectedDeviceId,
    alertTypeFilter,
    alertSeverityFilter,
    alertStatusFilter,
  ]);

  const handleResetFilters = () => {
    setDateRange({ from: addDays(new Date(), -7), to: new Date() });
    setSelectedDeviceId("all");
    setAlertTypeFilter("all");
    setAlertSeverityFilter("all");
    setAlertStatusFilter("all");
  };

  return (
    <main className="container mx-auto px-4 pb-4 lg:px-6 lg:pb-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <History className="mr-3 h-8 w-8 text-primary" />
          Riwayat Peringatan Global
        </h1>
        <p className="text-muted-foreground mt-1">
          Analisis semua catatan peringatan dari seluruh perangkat yang
          terdaftar.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filter Peringatan</CardTitle>
          <CardDescription>
            Saring data peringatan berdasarkan kriteria di bawah ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          <div className="lg:col-span-2 space-y-2">
            <Label>Rentang Waktu</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  className={`w-full justify-start text-left font-normal ${
                    !dateRange && "text-muted-foreground"
                  }`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {/* ▼▼▼ Gunakan logika format tanggal yang sama ▼▼▼ */}
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
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
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Perangkat</Label>
            <Select
              value={selectedDeviceId}
              onValueChange={setSelectedDeviceId}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Perangkat</SelectItem>
                {availableDevices.map((device) => (
                  <SelectItem key={device.device_id} value={device.device_id}>
                    {device.name || device.device_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipe Alert</Label>
            <Select value={alertTypeFilter} onValueChange={setAlertTypeFilter}>
              <SelectTrigger>
                <SelectValue />
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
          </div>
          <div className="space-y-2">
            <Label>Level</Label>
            <Select
              value={alertSeverityFilter}
              onValueChange={setAlertSeverityFilter}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Level</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <div className="flex-grow space-y-2">
              <Label>Status</Label>
              <Select
                value={alertStatusFilter}
                onValueChange={setAlertStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="true">Aktif</SelectItem>
                  <SelectItem value="false">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleResetFilters}
              className="self-end"
              title="Reset Filter"
            >
              <FilterX className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Peringatan</CardTitle>
          <CardDescription>
            Menampilkan semua riwayat peringatan yang tercatat di sistem sesuai
            filter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center py-10 text-destructive">
              <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
              <p className="font-semibold">Gagal Memuat Data</p>
              <p>{error}</p>
            </div>
          )}
          {!error && (
            <DataTable
              columns={alertHistoryColumns}
              data={alerts}
              pageCount={pageCount}
              pagination={pagination}
              onPaginationChange={setPagination}
              defaultSortColumnId="alert_triggered_at"
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
