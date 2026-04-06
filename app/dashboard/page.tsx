// app/dashboard/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelectedDevice } from "../../contexts/SelectedDeviceContext"; // Sesuaikan path!
import { useSession } from "@/hooks/useSession";

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { selectedDeviceId } = useSelectedDevice();
  const { status: sessionStatus } = useSession();

  useEffect(() => {
    if (sessionStatus === "loading") return; // Tunggu sesi dimuat
    if (sessionStatus === "unauthenticated") {
      // Ini seharusnya sudah ditangani oleh layout, tapi sebagai fallback
      router.replace("/login");
      return;
    }

    // selectedDeviceId akan diinisialisasi oleh context dari localStorage atau URL
    if (selectedDeviceId && sessionStatus === "authenticated") {
      const targetPath =
        selectedDeviceId === "all"
          ? "/dashboard/all"
          : `/dashboard/device/${selectedDeviceId}`;

      console.log(
        `[DashboardRedirectPage] Session authenticated. Redirecting to ${targetPath} based on context's selectedDeviceId: ${selectedDeviceId}`
      );
      router.replace(targetPath);
    }
    // Jika selectedDeviceId masih null (misalnya context belum selesai inisialisasi awal dan baca localStorage/URL),
    // tunggu hingga context mengupdatenya dan memicu re-render.
    // useEffect di dalam context juga akan mencoba redirect jika perlu.
  }, [selectedDeviceId, sessionStatus, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <p>Mengarahkan ke dashboard Anda...</p>
      {/* Atau komponen spinner/skeleton */}
    </div>
  );
}
