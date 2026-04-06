// components/layout/dashboard/DashboardLayout.tsx
"use client";

import { useSession } from "@/hooks/useSession";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
// Pastikan path impor SiteHeader ini benar sesuai struktur proyek Anda
// Misalnya: import { SiteHeader } from "@/components/layout/dashboard/SiteHeader";
// Atau jika berada di direktori yang sama: import { SiteHeader } from "./SiteHeader";
import { SiteHeader } from "./layout/dashboard/SiteHeader"; // Menggunakan path dari contoh Anda
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Komponen Skeleton untuk DashboardLayout.
 * Ini meniru struktur dasar dari SiteHeader dan area konten utama.
 * Sesuaikan skeleton untuk SiteHeader agar lebih akurat dengan konten SiteHeader Anda.
 */
const DashboardLayoutSkeleton = () => (
  <div className="flex min-h-screen w-full flex-col bg-muted/40 animate-pulse">
    {/* Skeleton untuk SiteHeader */}
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      {/* Skeleton untuk tombol menu mobile (jika ada) */}
      <Skeleton className="h-9 w-9 rounded-sm md:hidden" />

      {/* Skeleton untuk item navigasi/breadcrumb di header desktop */}
      <div className="hidden flex-1 items-center gap-4 md:flex">
        <Skeleton className="h-6 w-20 rounded-md" />
        <Skeleton className="h-6 w-20 rounded-md" />
      </div>

      {/* Skeleton untuk elemen di sisi kanan header (misal, search, user avatar) */}
      <div className="relative ml-auto flex items-center gap-2">
        <Skeleton className="h-8 w-32 rounded-lg sm:w-40" />{" "}
        {/* Contoh: Search bar */}
        <Skeleton className="h-9 w-9 rounded-full" />{" "}
        {/* Contoh: User avatar */}
      </div>
    </header>

    {/* Skeleton untuk area konten utama */}
    <main className="flex-1 p-4 sm:px-6 sm:py-6 md:gap-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-1/3 rounded-md" />{" "}
          {/* Judul Halaman Konten */}
          <Skeleton className="h-9 w-24 rounded-md" />{" "}
          {/* Tombol Aksi Konten */}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />{" "}
        {/* Blok Konten Besar */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl md:col-span-1 lg:col-span-1" />
        </div>
      </div>
    </main>
  </div>
);

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push(
        `/login?callbackUrl=${encodeURIComponent(
          window.location.pathname + window.location.search
        )}`
      );
    }
  }, [status, router]);

  // Jika status loading atau belum terautentikasi (sebelum redirect),
  // tampilkan DashboardLayoutSkeleton sebagai pengganti teks "Memuat sesi pengguna..."
  if (status === "loading" || status === "unauthenticated") {
    return <DashboardLayoutSkeleton />;
  }

  // Jika terautentikasi, render layout dashboard yang sebenarnya
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* Jika Anda memiliki Sidebar yang selalu terlihat di md: ke atas, 
        Anda bisa meletakkannya di sini sebagai sibling dari div berikutnya.
        Contoh:
        <AppSidebar className="hidden md:block" /> 
      */}
      <div className="flex flex-1 flex-col">
        {" "}
        {/* Wrapper ini mungkin sudah mencakup keseluruhan jika sidebar terintegrasi di SiteHeader */}
        <SiteHeader />
        <main className="flex-1 p-4 sm:px-6 sm:py-6 md:gap-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
