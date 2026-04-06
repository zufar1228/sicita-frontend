// app/dashboard/layout.tsx
"use client";

import { useSession, signOut } from "@/hooks/useSession";
import { useRouter, usePathname } from "next/navigation";
import React, { useEffect } from "react";
import { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";
import { CriticalWaterQualityAlertData } from "@/types/sensor";
import { jwtDecode } from "jwt-decode"; // <-- Baru
import { toast } from "sonner"; // <-- Baru
import { useDemo } from "@/lib/demo/context";
import { getBackendUrl } from "@/lib/demo/utils";

import { AppSidebar } from "@/components/layout/dashboard/AppSidebar";
import { SiteHeader } from "@/components/layout/dashboard/SiteHeader";
import { DemoBanner } from "@/components/DemoBanner";
import { SelectedDeviceProvider } from "../../contexts/SelectedDeviceContext";
import { SidebarProvider } from "@/components/ui/sidebar";

interface DashboardLayoutSocketEvents {
  critical_water_quality_alert: (data: CriticalWaterQualityAlertData) => void;
}

// Komponen Internal untuk mengakses hook useSidebar
function MainContentArea({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-grow h-full overflow-hidden">
      <SiteHeader />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}

export default function DashboardAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { isDemoMode, isHydrated } = useDemo();
  const apiUrl = getBackendUrl();

  // useEffect untuk proteksi sesi
  useEffect(() => {
    if (!isHydrated) return; // Wait for hydration to check demo mode
    if (isDemoMode) return; // Skip auth check in demo mode
    if (status === "loading") return;
    if (status === "unauthenticated") {
      const callbackUrl =
        pathname +
        (typeof window !== "undefined" ? window.location.search : "");
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [isHydrated, isDemoMode, status, router, pathname]);

  // ▼▼▼ useEffect BARU UNTUK CEK KEDALUWARSA TOKEN ▼▼▼
  useEffect(() => {
    if (!isHydrated) return; // Wait for hydration
    if (isDemoMode) return; // Skip token check in demo mode
    if (status === "authenticated" && session?.user?.backendToken) {
      // Decode token untuk mendapatkan waktu kedaluwarsa (exp)
      // Waktu 'exp' dalam format UNIX timestamp (detik)
      const decodedToken: { exp: number } = jwtDecode(
        session.user.backendToken
      );

      const checkTokenExpiration = () => {
        // Ambil waktu saat ini dalam detik
        const currentTime = Date.now() / 1000;

        if (decodedToken.exp < currentTime) {
          console.log(
            "Sesi backend terdeteksi kedaluwarsa, melakukan logout..."
          );
          toast.error("Sesi Anda telah berakhir", {
            description: "Silakan login kembali untuk melanjutkan.",
          });
          signOut({ callbackUrl: "/login?reason=session-expired" });
        }
      };

      // Jalankan pengecekan pertama kali saat komponen dimuat
      checkTokenExpiration();

      // Atur interval untuk memeriksa setiap 1 menit (60000 ms)
      const intervalId = setInterval(checkTokenExpiration, 60000);

      // Cleanup function: Hapus interval saat komponen di-unmount
      // Ini sangat penting untuk mencegah memory leak!
      return () => clearInterval(intervalId);
    }
  }, [isDemoMode, status, session, isHydrated]); // Dijalankan setiap kali status atau sesi berubah

  // useEffect untuk listener socket global
  useEffect(() => {
    if (!isHydrated) return; // Wait for hydration
    if (isDemoMode) return; // Skip socket in demo mode (pages handle their own mock sockets)
    if (status === "authenticated" && session?.user?.backendToken && apiUrl) {
      const socket: Socket<DashboardLayoutSocketEvents> = getSocket(
        apiUrl,
        session.user.backendToken
      );
      const handleGlobalCriticalWaterQualityAlert = () => {
        // ... (logika toast Anda) ...
      };
      socket.on(
        "critical_water_quality_alert",
        handleGlobalCriticalWaterQualityAlert
      );
      return () => {
        socket.off(
          "critical_water_quality_alert",
          handleGlobalCriticalWaterQualityAlert
        );
      };
    }
  }, [isHydrated, status, session?.user?.backendToken, apiUrl, router, isDemoMode]);

  // Show loading while hydrating or checking auth
  if (!isHydrated || (!isDemoMode && (status === "loading" || status === "unauthenticated"))) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-muted-foreground">
        <p>Memuat sesi pengguna...</p>
      </div>
    );
  }

  return (
    <SelectedDeviceProvider>
      <SidebarProvider>
        <DemoBanner />
        <div className="flex h-screen w-full bg-muted/40 dark:bg-muted/20">
          <AppSidebar />
          <MainContentArea>
            <div className="overflow-hidden ">{children}</div>
          </MainContentArea>
        </div>
      </SidebarProvider>
    </SelectedDeviceProvider>
  );
}
