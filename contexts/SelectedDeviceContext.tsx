// app/contexts/SelectedDeviceContext.tsx
"use client";

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
  // Dispatch dan SetStateAction tidak perlu diimpor eksplisit jika tidak dipakai di tipe interface
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useDemo } from "@/lib/demo/context";
import { Device } from "@/types/device";
import { DEMO_DEVICES } from "@/lib/demo/data";
import { getBackendUrl } from "@/lib/demo/utils";

interface SelectedDeviceContextType {
  selectedDeviceId: string | "all";
  setSelectedDeviceId: (
    deviceId: string | "all",
    options?: { navigate?: boolean }
  ) => void;
  availableDevices: Device[];
  setAvailableDevices: React.Dispatch<React.SetStateAction<Device[]>>; // Tetap ada jika /dashboard/all ingin update cepat
  isLoadingAvailableDevices: boolean;
  setIsLoadingAvailableDevices: React.Dispatch<React.SetStateAction<boolean>>; // Tetap ada untuk kontrol eksplisit
  currentDevice: Device | null;
  fetchAvailableDevices: () => Promise<void>; // Fungsi untuk memuat ulang jika perlu
}

const SelectedDeviceContext = createContext<
  SelectedDeviceContextType | undefined
>(undefined);

export const SelectedDeviceProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [selectedDeviceIdInternal, setSelectedDeviceIdInternal] = useState<
    string | "all"
  >("all");
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [isLoadingAvailableDevices, setIsLoadingAvailableDevices] =
    useState<boolean>(true); // Mulai dengan true

  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status: sessionStatus } = useSession();
  const { isDemoMode } = useDemo();

  const backendUrl = getBackendUrl();

  // Load demo devices directly in demo mode
  useEffect(() => {
    if (isDemoMode && availableDevices.length === 0) {
      setAvailableDevices(DEMO_DEVICES as Device[]);
      setIsLoadingAvailableDevices(false);
    }
  }, [isDemoMode, availableDevices.length]);

  // Fungsi untuk mengambil daftar perangkat yang tersedia
  const fetchAvailableDevices = useCallback(async () => {
    if (isDemoMode) {
      setAvailableDevices(DEMO_DEVICES as Device[]);
      setIsLoadingAvailableDevices(false);
      return;
    }
    if (
      sessionStatus !== "authenticated" ||
      !session?.user?.backendToken ||
      !backendUrl
    ) {
      // console.log("[SelectedDeviceContext] Tidak bisa fetch devices: sesi belum siap atau token/URL tidak ada.");
      setAvailableDevices([]); // Pastikan kosong jika tidak bisa fetch
      setIsLoadingAvailableDevices(false); // Selesaikan loading
      return;
    }

    // console.log("[SelectedDeviceContext] Mulai fetch available devices...");
    setIsLoadingAvailableDevices(true);
    try {
      const response = await fetch(`${backendUrl}/api/devices`, {
        headers: { Authorization: `Bearer ${session.user.backendToken}` },
      });
      if (!response.ok) {
        console.error(
          `[SelectedDeviceContext] Gagal mengambil daftar perangkat: ${response.status}`
        );
        throw new Error("Gagal mengambil daftar perangkat untuk context");
      }
      const data: Device[] = await response.json();
      // console.log(`[SelectedDeviceContext] Berhasil fetch ${data.length} devices.`);
      setAvailableDevices(data);
    } catch (error) {
      console.error(
        "[SelectedDeviceContext] Error saat fetch available devices:",
        error
      );
      setAvailableDevices([]); // Kosongkan jika error
    } finally {
      setIsLoadingAvailableDevices(false);
    }
  }, [sessionStatus, session?.user?.backendToken, backendUrl]);

  // Efek untuk sinkronisasi selectedDeviceId dari URL dan fetch availableDevices jika perlu
  useEffect(() => {
    // console.log(`[SelectedDeviceContext] Pathname effect running. Path: ${pathname}, Current SDI: ${selectedDeviceIdInternal}`);
    const pathSegments = (pathname || "").split("/");
    let deviceIdFromUrlOrStorage: string | "all" = "all"; // Default

    if (pathSegments[1] === "dashboard") {
      if (
        (pathSegments[2] === "device" || pathSegments[2] === "history") &&
        pathSegments[3] &&
        pathSegments[3] !== "all"
      ) {
        deviceIdFromUrlOrStorage = pathSegments[3];
      } else if (
        pathSegments[2] === "all" ||
        (pathSegments[2] === "history" && pathSegments[3] === "all")
      ) {
        deviceIdFromUrlOrStorage = "all";
      } else {
        const storedDeviceId =
          typeof window !== "undefined"
            ? localStorage.getItem("selectedDeviceId")
            : null;
        if (storedDeviceId) {
          deviceIdFromUrlOrStorage = storedDeviceId;
        }
      }
    }

    if (selectedDeviceIdInternal !== deviceIdFromUrlOrStorage) {
      // console.log(`[SelectedDeviceContext] Updating internal selectedId from ${selectedDeviceIdInternal} to ${deviceIdFromUrlOrStorage} based on URL/localStorage.`);
      setSelectedDeviceIdInternal(deviceIdFromUrlOrStorage);
      if (typeof window !== "undefined") {
        localStorage.setItem("selectedDeviceId", deviceIdFromUrlOrStorage);
      }
    }

    // Ambil availableDevices jika array kosong DAN sesi sudah terautentikasi
    // Ini akan berjalan saat refresh di halaman manapun di bawah /dashboard
    if (availableDevices.length === 0 && sessionStatus === "authenticated") {
      // console.log("[SelectedDeviceContext] availableDevices kosong & sesi authenticated, memanggil fetchAvailableDevices.");
      fetchAvailableDevices();
    } else if (availableDevices.length > 0 && isLoadingAvailableDevices) {
      // Jika availableDevices sudah terisi (misal dari navigasi sebelumnya atau localStorage jika Anda implementasi)
      // tapi isLoadingAvailableDevices masih true, set ke false.
      setIsLoadingAvailableDevices(false);
    } else if (
      sessionStatus !== "authenticated" &&
      sessionStatus !== "loading"
    ) {
      // Jika tidak ada sesi, kosongkan devices dan set loading false
      setAvailableDevices([]);
      setIsLoadingAvailableDevices(false);
    }
  }, [pathname, sessionStatus, availableDevices.length, fetchAvailableDevices]); // fetchAvailableDevices dijamin stabil oleh useCallback

  const handleSetSelectedDeviceId = useCallback(
    (deviceId: string | "all", options?: { navigate?: boolean }) => {
      // console.log(`[Context setSelectedDeviceId] Called: ${deviceId}, Navigate: ${options?.navigate}, Current Path: ${pathname}, Current SDI: ${selectedDeviceIdInternal}`);
      const shouldNavigate =
        options?.navigate !== undefined ? options.navigate : true;
      const previousDeviceId = selectedDeviceIdInternal;

      setSelectedDeviceIdInternal(deviceId);
      if (typeof window !== "undefined") {
        localStorage.setItem("selectedDeviceId", deviceId);
      }

      const safePathname = pathname || "";

      if (shouldNavigate && previousDeviceId !== deviceId) {
        let targetPath = "";
        const pathSegments = safePathname.split("/");
        const currentMainPath = pathSegments[1];
        const currentSubPath = pathSegments[2];

        if (currentMainPath !== "dashboard") {
          targetPath =
            deviceId === "all"
              ? "/dashboard/all"
              : `/dashboard/device/${deviceId}`;
        } else {
          if (currentSubPath === "device" || currentSubPath === "history") {
            targetPath =
              deviceId === "all"
                ? currentSubPath === "history"
                  ? "/dashboard/history/all"
                  : "/dashboard/all"
                : `/dashboard/${currentSubPath}/${deviceId}`;
          } else {
            targetPath =
              deviceId === "all"
                ? "/dashboard/all"
                : `/dashboard/device/${deviceId}`;
          }
        }
        if (targetPath === "/dashboard/device/all" && deviceId === "all") {
          // Fallback
          targetPath = "/dashboard/all";
        }

        if (safePathname !== targetPath) {
          // console.log(`[Context setSelectedDeviceId] Navigating from ${safePathname} to ${targetPath}`);
          router.push(targetPath);
        }
      }
    },
    [router, pathname, selectedDeviceIdInternal]
  );

  const currentDevice = useMemo(() => {
    if (
      selectedDeviceIdInternal &&
      selectedDeviceIdInternal !== "all" &&
      availableDevices.length > 0
    ) {
      return (
        availableDevices.find(
          (d) => d.device_id === selectedDeviceIdInternal
        ) || null
      );
    }
    return null;
  }, [selectedDeviceIdInternal, availableDevices]);

  const value = {
    selectedDeviceId: selectedDeviceIdInternal,
    setSelectedDeviceId: handleSetSelectedDeviceId,
    availableDevices,
    setAvailableDevices,
    isLoadingAvailableDevices,
    setIsLoadingAvailableDevices,
    currentDevice,
    fetchAvailableDevices, // Tambahkan ini ke context value
  };

  return (
    <SelectedDeviceContext.Provider value={value}>
      {children}
    </SelectedDeviceContext.Provider>
  );
};

export const useSelectedDevice = () => {
  const context = useContext(SelectedDeviceContext);
  if (context === undefined) {
    throw new Error(
      "useSelectedDevice must be used within a SelectedDeviceProvider"
    );
  }
  return context;
};
