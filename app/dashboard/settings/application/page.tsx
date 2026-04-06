// app/dashboard/settings/application/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "@/hooks/useSession";
import { getBackendUrl } from "@/lib/demo/utils";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter, // Ditambahkan jika tombol simpan preferensi perlu footer
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import {
  Settings,
  Palette,
  BellRing,
  Loader2,
  AlertTriangle,
  Info,
  Save,
} from "lucide-react"; // Tambahkan ikon
import { Device } from "@/types/device"; // Impor tipe Device
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

// Tipe dari NotificationPreferencesPage Anda
// Tidak perlu didefinisikan ulang jika sudah ada di scope lain, tapi untuk kejelasan di sini:
// interface Device { /* ... */ } // Asumsi sudah diimpor dari @/types/device

export default function ApplicationSettingsPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  // State untuk Tema (sudah ada)
  // ... (jika ada state lain khusus tema)

  // State untuk Preferensi Notifikasi Push (dari NotificationPreferencesPage Anda)
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [selectedDeviceIdsForPush, setSelectedDeviceIdsForPush] = useState<
    Set<string>
  >(new Set());
  const [currentPushSubscription, setCurrentPushSubscription] =
    useState<PushSubscription | null>(null);
  const [isLoadingNotificationPrefs, setIsLoadingNotificationPrefs] =
    useState<boolean>(true);
  const [isSavingNotificationPrefs, setIsSavingNotificationPrefs] =
    useState<boolean>(false);
  const [notificationPrefsError, setNotificationPrefsError] = useState<
    string | null
  >(null);
  // serviceWorkerRegistration tidak perlu jadi state jika hanya dipakai sementara di useEffect

  const backendUrl = getBackendUrl();

  // --- LOGIKA UNTUK PREFERENSI NOTIFIKASI PUSH ---

  // 1. Registrasi Service Worker dan dapatkan langganan push saat ini
  useEffect(() => {
    if (sessionStatus === "authenticated") {
      if (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window
      ) {
        navigator.serviceWorker.ready
          .then((swReg) => {
            // setServiceWorkerRegistration(swReg); // Tidak perlu disimpan di state jika hanya untuk getSubscription
            swReg.pushManager.getSubscription().then((subscription) => {
              if (subscription) {
                setCurrentPushSubscription(subscription);
                setNotificationPrefsError(null); // Hapus error jika langganan ditemukan
              } else {
                setNotificationPrefsError(
                  "Anda belum berlangganan notifikasi push. Aktifkan dari dashboard untuk mengatur preferensi."
                );
                setIsLoadingNotificationPrefs(false);
              }
            });
          })
          .catch((err) => {
            console.error("Service worker tidak siap:", err);
            setNotificationPrefsError("Gagal mengakses service worker.");
            setIsLoadingNotificationPrefs(false);
          });
      } else {
        if (typeof window !== "undefined") {
          setNotificationPrefsError("Browser tidak mendukung notifikasi push.");
          setIsLoadingNotificationPrefs(false);
        }
      }
    } else if (sessionStatus === "unauthenticated") {
      setIsLoadingNotificationPrefs(false);
    }
  }, [sessionStatus]);

  // 2. Ambil semua perangkat dan preferensi saat ini setelah langganan ditemukan
  const fetchNotificationPrefData = useCallback(async () => {
    if (
      !currentPushSubscription ||
      !backendUrl ||
      !session?.user?.backendToken ||
      sessionStatus !== "authenticated"
    ) {
      setIsLoadingNotificationPrefs(false); // Selesaikan loading jika tidak bisa fetch
      return;
    }

    setIsLoadingNotificationPrefs(true);
    setNotificationPrefsError(null); // Reset error sebelum fetch baru

    try {
      // Ambil semua perangkat
      const devicesResponse = await fetch(`${backendUrl}/api/devices`, {
        headers: { Authorization: `Bearer ${session.user.backendToken}` },
      });
      if (!devicesResponse.ok)
        throw new Error("Gagal mengambil daftar perangkat.");
      const devicesData: Device[] = await devicesResponse.json();
      setAllDevices(devicesData);

      // Ambil preferensi saat ini
      const prefsResponse = await fetch(
        `${backendUrl}/api/notification-preferences?subscriptionEndpoint=${encodeURIComponent(
          currentPushSubscription.endpoint
        )}`,
        { headers: { Authorization: `Bearer ${session.user.backendToken}` } }
      );
      if (prefsResponse.ok) {
        const prefsData: { deviceIds: string[] } = await prefsResponse.json();
        setSelectedDeviceIdsForPush(new Set(prefsData.deviceIds));
      } else if (prefsResponse.status === 404) {
        // Jika 404, berarti belum ada preferensi, set ke kosong
        setSelectedDeviceIdsForPush(new Set());
        console.log("Belum ada preferensi notifikasi untuk langganan ini.");
      } else {
        const errorData = await prefsResponse.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Gagal mengambil preferensi notifikasi."
        );
      }
    } catch (err) {
      console.error("Error fetching notification preference data:", err);
      setNotificationPrefsError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memuat preferensi."
      );
    } finally {
      setIsLoadingNotificationPrefs(false);
    }
  }, [
    currentPushSubscription,
    backendUrl,
    sessionStatus,
    session?.user?.backendToken,
  ]);

  useEffect(() => {
    if (currentPushSubscription && sessionStatus === "authenticated") {
      fetchNotificationPrefData();
    }
  }, [currentPushSubscription, sessionStatus, fetchNotificationPrefData]);

  const handleCheckboxChange = (
    deviceId: string,
    checked: boolean | "indeterminate"
  ) => {
    // Type 'checked' dari shadcn Checkbox
    setSelectedDeviceIdsForPush((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (checked === true) {
        // Hanya tambah jika benar-benar true
        newSelected.add(deviceId);
      } else {
        newSelected.delete(deviceId);
      }
      return newSelected;
    });
  };

  const handleSavePreferences = async () => {
    if (
      !currentPushSubscription?.endpoint ||
      !session?.user?.backendToken ||
      !backendUrl
    ) {
      toast.error("Error", {
        description: "Langganan push atau sesi tidak valid.",
      });
      return;
    }
    setIsSavingNotificationPrefs(true);
    try {
      const payload = {
        subscriptionEndpoint: currentPushSubscription.endpoint,
        deviceIds: Array.from(selectedDeviceIdsForPush),
      };
      const response = await fetch(
        `${backendUrl}/api/notification-preferences`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.user.backendToken}`,
          },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Gagal menyimpan preferensi.");
      }
      toast.success("Sukses!", {
        description: "Preferensi notifikasi berhasil disimpan.",
      });
    } catch (err) {
      console.error("Error saving preferences:", err);
      toast.error("Gagal Menyimpan", {
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    } finally {
      setIsSavingNotificationPrefs(false);
    }
  };

  // --- AKHIR LOGIKA PREFERENSI NOTIFIKASI PUSH ---

  // Proteksi halaman utama (jika belum terautentikasi)
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (sessionStatus === "unauthenticated") {
      router.push(
        `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
      );
    }
    // Cek peran admin jika halaman ini khusus admin (saat ini tidak)
  }, [sessionStatus, router]);

  if (sessionStatus === "loading" || !session) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center min-h-[calc(100vh-150px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-8 max-w-3xl">
      <header className="mb-4">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center">
          <Settings className="mr-3 h-7 w-7 text-primary" />
          Pengaturan Aplikasi
        </h1>
        <p className="text-muted-foreground text-sm">
          Kelola preferensi dan konfigurasi global untuk aplikasi.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Palette className="mr-2 h-5 w-5" />
            Tema Tampilan
          </CardTitle>
          <CardDescription>
            Pilih tema tampilan global untuk aplikasi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 items-center sm:grid-cols-[1fr_auto]">
            <Label htmlFor="theme-switcher" className="text-sm font-normal">
              Mode Tema:
            </Label>
            <ThemeSwitcher />
          </div>
        </CardContent>
      </Card>

      {/* Kartu untuk Preferensi Notifikasi Push Perangkat */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <BellRing className="mr-2 h-5 w-5" />
            Preferensi Notifikasi Push Perangkat
          </CardTitle>
          <CardDescription>
            Pilih perangkat mana saja yang ingin Anda terima notifikasi Web
            Push-nya. Pastikan Anda sudah mengaktifkan notifikasi push di
            browser Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingNotificationPrefs && !notificationPrefsError && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memuat preferensi notifikasi...
            </div>
          )}

          {notificationPrefsError && (
            <Alert
              variant="destructive"
              className="bg-yellow-50 border-yellow-500/50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700/50"
            >
              <AlertTriangle className="h-4 w-4" />
              {/* <AlertTitle>Pemberitahuan</AlertTitle> */}
              <AlertDescription className="text-xs">
                {notificationPrefsError}
                {notificationPrefsError.includes("berlangganan") && (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto ml-1 text-xs"
                    asChild
                  >
                    <Link href="/dashboard/all">Aktifkan di Dashboard</Link>
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {!isLoadingNotificationPrefs &&
            !notificationPrefsError &&
            currentPushSubscription &&
            allDevices.length === 0 && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Info className="mr-2 h-4 w-4" />
                Tidak ada perangkat yang tersedia untuk diatur notifikasinya.
              </div>
            )}

          {!isLoadingNotificationPrefs &&
            !notificationPrefsError &&
            currentPushSubscription &&
            allDevices.length > 0 && (
              <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
                {" "}
                {allDevices.map((device) => (
                  <div
                    key={device.device_id}
                    className="flex items-center space-x-3 rounded-md border p-3 hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      id={`device-pref-${device.device_id}`}
                      checked={selectedDeviceIdsForPush.has(device.device_id)}
                      onCheckedChange={(checkedState) =>
                        handleCheckboxChange(device.device_id, checkedState)
                      }
                    />
                    <Label
                      htmlFor={`device-pref-${device.device_id}`}
                      className="flex-grow cursor-pointer text-sm font-normal"
                    >
                      <span className="font-medium">
                        {device.name || device.device_id}
                      </span>
                      {device.location && (
                        <span className="text-xs text-muted-foreground block">
                          ({device.location})
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
        {!isLoadingNotificationPrefs &&
          !notificationPrefsError &&
          currentPushSubscription &&
          allDevices.length > 0 && (
            <CardFooter className="border-t pt-6">
              <Button
                onClick={handleSavePreferences}
                disabled={isSavingNotificationPrefs}
              >
                {isSavingNotificationPrefs ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Simpan Preferensi Notifikasi
              </Button>
            </CardFooter>
          )}
      </Card>
    </div>
  );
}
