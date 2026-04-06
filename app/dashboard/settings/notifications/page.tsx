"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { getBackendUrl } from "@/lib/demo/utils";
import { Device } from "@/types/device";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import Link from "next/link";
import { Loader2 } from "lucide-react"; // Impor Loader2 jika belum ada
import { useDemo } from "@/lib/demo/context";
import { DEMO_DEVICES } from "@/lib/demo/data";

export default function NotificationPreferencesPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { isDemoMode } = useDemo();

  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(
    new Set()
  );
  const [currentSubscription, setCurrentSubscription] =
    useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Demo mode: simulate subscription state
  const [demoSubscribed, setDemoSubscribed] = useState<boolean>(false);

  // PERBAIKAN: Deklarasi useState yang benar
  const [_serviceWorkerRegistration, setServiceWorkerRegistration] = // Variabel state (serviceWorkerRegistration) di-prefix _ karena tidak dibaca
    useState<ServiceWorkerRegistration | null>(null);

  const backendUrl = getBackendUrl();

  // Demo mode initialization
  useEffect(() => {
    if (!isDemoMode) return;
    const sub = typeof window !== "undefined" && localStorage.getItem("sicita_demo_push_subscribed") === "true";
    setDemoSubscribed(sub);
    if (sub) {
      setAllDevices(DEMO_DEVICES);
      // Load saved demo preferences
      const savedPrefs = typeof window !== "undefined" ? localStorage.getItem("sicita_demo_notif_prefs") : null;
      if (savedPrefs) {
        try {
          setSelectedDeviceIds(new Set(JSON.parse(savedPrefs)));
        } catch {
          setSelectedDeviceIds(new Set(DEMO_DEVICES.map(d => d.device_id)));
        }
      } else {
        setSelectedDeviceIds(new Set(DEMO_DEVICES.map(d => d.device_id)));
      }
    }
    setIsLoading(false);
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode) return;
    if (sessionStatus === "loading") return;
    if (sessionStatus === "unauthenticated") {
      router.push(
        `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
      );
    }
  }, [isDemoMode, sessionStatus, router]);

  useEffect(() => {
    if (isDemoMode) return; // Demo mode handles its own init
    if (sessionStatus === "authenticated") {
      if (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window
      ) {
        navigator.serviceWorker.ready
          .then((swReg) => {
            setServiceWorkerRegistration(swReg); // Sekarang ini adalah fungsi setter yang benar
            swReg.pushManager
              .getSubscription()
              .then((subscription) => {
                if (subscription) {
                  setCurrentSubscription(subscription);
                  console.log(
                    "Langganan push saat ini ditemukan:",
                    subscription.endpoint
                  );
                  // setIsLoading(false) akan dihandle oleh fetchInitialData atau useEffect berikutnya
                } else {
                  setError(
                    "Anda belum berlangganan notifikasi push. Harap aktifkan notifikasi terlebih dahulu untuk mengatur preferensi."
                  );
                  console.warn("Tidak ada langganan push yang aktif.");
                  setIsLoading(false);
                }
              })
              .catch((err) => {
                console.error("Error getting subscription:", err);
                setError("Gagal mendapatkan status langganan push.");
                setIsLoading(false);
              });
          })
          .catch((err) => {
            console.error("Service worker tidak siap:", err);
            setError(
              "Gagal mengakses service worker untuk preferensi notifikasi."
            );
            setIsLoading(false);
          });
      } else {
        if (typeof window !== "undefined") {
          setError("Browser tidak mendukung Service Worker atau Push API.");
          setIsLoading(false);
        }
      }
    } else if (sessionStatus === "unauthenticated") {
      setIsLoading(false);
    }
    // PERBAIKAN BARIS 94: Tambahkan setServiceWorkerRegistration ke dependency array
  }, [sessionStatus, setServiceWorkerRegistration]);

  const fetchInitialData = useCallback(async () => {
    if (!currentSubscription || !backendUrl || !session?.user?.backendToken) {
      if (
        currentSubscription &&
        sessionStatus === "authenticated" &&
        !session?.user?.backendToken
      ) {
        setError("Token autentikasi backend tidak ditemukan di sesi.");
      }
      // Jika tidak ada currentSubscription dan sudah tidak loading awal SW, set loading ke false
      // Ini ditangani oleh useEffect yang memanggil fetchInitialData
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const devicesResponse = await fetch(`${backendUrl}/api/devices`, {
        headers: { Authorization: `Bearer ${session.user.backendToken}` },
      });
      if (!devicesResponse.ok) {
        if (devicesResponse.status === 401)
          throw new Error("Akses ditolak saat mengambil daftar perangkat.");
        throw new Error(
          `Gagal mengambil daftar perangkat: ${devicesResponse.statusText}`
        );
      }
      const devicesData: Device[] = await devicesResponse.json();
      setAllDevices(devicesData);

      const prefsResponse = await fetch(
        `${backendUrl}/api/notification-preferences?subscriptionEndpoint=${encodeURIComponent(
          currentSubscription.endpoint
        )}`,
        {
          headers: { Authorization: `Bearer ${session.user.backendToken}` },
        }
      );

      // Backend mengembalikan array kosong dan status 200 jika tidak ada preferensi,
      // atau jika subscription tidak ditemukan di tabel preferensi.
      // Tidak perlu menangani 404 secara khusus jika backend sudah dimodifikasi.
      if (!prefsResponse.ok) {
        if (prefsResponse.status === 401) {
          throw new Error(
            "Akses ditolak saat mengambil preferensi notifikasi."
          );
        }
        const errorData = await prefsResponse.json().catch(() => ({
          message: `Gagal mengambil preferensi: Status ${prefsResponse.status} ${prefsResponse.statusText}`,
        }));
        throw new Error(
          (errorData as { message?: string }).message ||
            `Gagal mengambil preferensi: ${prefsResponse.statusText}`
        );
      }

      const prefsData: { deviceIds?: string[] } = await prefsResponse.json();
      setSelectedDeviceIds(new Set(prefsData.deviceIds || [])); // Default ke array kosong jika deviceIds tidak ada
      console.log("Preferensi saat ini dimuat:", prefsData.deviceIds || []);
    } catch (err) {
      console.error("Error fetching initial data for preferences:", err);
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan tidak diketahui"
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentSubscription, backendUrl, sessionStatus, session]); // session untuk session.user.backendToken

  useEffect(() => {
    if (sessionStatus === "authenticated" && currentSubscription) {
      fetchInitialData();
    } else if (
      sessionStatus === "authenticated" &&
      !currentSubscription &&
      !isLoading &&
      !error
    ) {
      // Jika sudah terautentikasi, tidak loading, tidak ada error, TAPI belum ada subscription
      // (misalnya dari useEffect SW pertama), maka ini kondisi di mana user perlu subscribe dulu.
      // Pesan error dari useEffect SW sudah menangani ini.
      // Tidak perlu setIsLoading(false) lagi di sini karena sudah dihandle.
    }
  }, [sessionStatus, currentSubscription, fetchInitialData, isLoading, error]); // isLoading & error ditambahkan agar tidak memanggil fetchInitialData saat error sudah ada

  const handleCheckboxChange = (deviceId: string, checked: boolean) => {
    setSelectedDeviceIds((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (checked) {
        newSelected.add(deviceId);
      } else {
        newSelected.delete(deviceId);
      }
      return newSelected;
    });
  };

  const handleSavePreferences = async () => {
    // Demo mode: save to localStorage
    if (isDemoMode) {
      setIsSaving(true);
      setTimeout(() => {
        localStorage.setItem("sicita_demo_notif_prefs", JSON.stringify(Array.from(selectedDeviceIds)));
        setIsSaving(false);
        toast.success("Sukses!", {
          description: "Preferensi notifikasi berhasil disimpan. (Demo)",
        });
      }, 600);
      return;
    }

    if (
      !currentSubscription ||
      !currentSubscription.endpoint ||
      !session?.user?.backendToken
    ) {
      toast.error("Error", {
        description:
          "Langganan push atau sesi tidak aktif. Harap aktifkan notifikasi dan login.",
      });
      return;
    }
    if (!backendUrl) {
      toast.error("Error Konfigurasi", {
        description: "URL Backend tidak diatur.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        subscriptionEndpoint: currentSubscription.endpoint,
        deviceIds: Array.from(selectedDeviceIds),
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
        const errorData = await response.json().catch(() => ({
          message: `Gagal menyimpan preferensi: ${response.statusText}`,
        }));
        if (response.status === 401)
          throw new Error("Akses ditolak saat menyimpan preferensi.");
        throw new Error(
          (errorData as { message?: string }).message || // Akses message dengan aman
            `Gagal menyimpan preferensi: ${response.statusText}`
        );
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
      setIsSaving(false);
    }
  };

  if (sessionStatus === "loading") {
    return (
      <main className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Memeriksa sesi...</p>
      </main>
    );
  }

  if (sessionStatus === "unauthenticated") {
    // Redirect sudah dihandle oleh useEffect, tampilkan fallback
    return (
      <main className="container mx-auto p-4 text-center">
        <p>Anda tidak terautentikasi. Mengarahkan ke halaman login...</p>
      </main>
    );
  }

  // Hanya render konten utama jika sesi terautentikasi
  // Kondisi loading, error, dan !currentSubscription ditangani di dalam
  if (sessionStatus === "authenticated") {
    if (isLoading && !error) {
      // Tampilkan loading hanya jika belum ada error
      return (
        <main className="container mx-auto p-4 flex justify-center items-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="ml-2">Memuat preferensi notifikasi...</p>
        </main>
      );
    }

    if (error) {
      return (
        <main className="container mx-auto p-4">
          <h1 className="text-2xl font-bold mb-6 text-center">
            Preferensi Notifikasi Perangkat
          </h1>
          <Card className="w-full max-w-md mx-auto mt-4">
            <CardHeader>
              <CardTitle className="text-center text-red-500">
                Terjadi Kesalahan
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p>{error}</p>
              {error.includes("berlangganan") && ( // Jika error menyebutkan "berlangganan"
                <Link href="/dashboard/settings/account" passHref>
                  {/* Ubah link ke halaman pengaturan notifikasi utama jika ada */}
                  <Button variant="link" className="mt-2">
                    Aktifkan Notifikasi Push di Pengaturan Akun
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </main>
      );
    }

    // Jika tidak loading, tidak error, tapi currentSubscription masih null (setelah usaha awal)
    // ini berarti service worker berhasil tapi tidak ada subscription. Error di atas seharusnya sudah menangani ini.
    // Blok ini bisa jadi redundant jika error handling di atas sudah mencakup kasus !currentSubscription.
    // if (!currentSubscription && !isLoading) { ... }

    return (
      <main className="container mx-auto p-4">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-center">
            Preferensi Notifikasi Perangkat
          </h1>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Pilih perangkat mana saja yang ingin Anda terima notifikasi Web
            Push-nya. Fitur ini memerlukan Anda untuk mengaktifkan notifikasi
            push di browser terlebih dahulu.
          </p>
          {!currentSubscription && !isDemoMode &&
            !isLoading && ( // Tambahan jika belum subscribe
              <p className="text-center text-sm text-orange-600 dark:text-orange-400 mt-2">
                Anda belum mengaktifkan notifikasi push. Silakan aktifkan
                melalui{" "}
                <Link
                  href="/dashboard/settings/account"
                  className="underline hover:text-orange-700"
                >
                  pengaturan akun
                </Link>{" "}
                Anda.
              </p>
            )}
          {isDemoMode && !demoSubscribed && !isLoading && (
            <p className="text-center text-sm text-orange-600 dark:text-orange-400 mt-2">
              Anda belum mengaktifkan notifikasi push. Silakan aktifkan di halaman Dashboard terlebih dahulu.
            </p>
          )}
        </header>
        {(currentSubscription || (isDemoMode && demoSubscribed)) && allDevices.length === 0 && !isLoading && (
          <p className="text-center text-gray-500 dark:text-gray-400">
            Tidak ada perangkat yang tersedia untuk dipilih.
          </p>
        )}
        {(currentSubscription || (isDemoMode && demoSubscribed)) && allDevices.length > 0 && (
          <Card className="w-full max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>Pilih Perangkat</CardTitle>
              <CardDescription>
                Centang perangkat yang ingin Anda terima notifikasinya.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-96 overflow-y-auto">
              {allDevices.map((device) => (
                <div
                  key={device.device_id}
                  className="flex items-center space-x-3 p-2 border-b dark:border-gray-700 last:border-b-0"
                >
                  <Checkbox
                    id={`device-pref-${device.device_id}`}
                    checked={selectedDeviceIds.has(device.device_id)}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange(device.device_id, !!checked)
                    }
                  />
                  <Label
                    htmlFor={`device-pref-${device.device_id}`}
                    className="flex-grow cursor-pointer"
                  >
                    <span className="font-medium">
                      {device.name || device.device_id}
                    </span>
                    {device.location && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">
                        ({device.location})
                      </span>
                    )}
                  </Label>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleSavePreferences}
                disabled={isSaving || isLoading || (!currentSubscription && !(isDemoMode && demoSubscribed))}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Preferensi"
                )}
              </Button>
            </CardFooter>
          </Card>
        )}
      </main>
    );
  }
  return null; // Fallback jika status sesi tidak terduga
}
