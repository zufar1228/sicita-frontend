// app/dashboard/admin/devices/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { getBackendUrl } from "@/lib/demo/utils";
import { Device } from "@/types/device"; // Pastikan path tipe Device Anda benar
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import Link from "next/link";
import {
  PlusCircle,
  Edit3,
  Trash2,
  ListChecks,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Wifi,
  WifiOff,
} from "lucide-react";

export default function DeviceManagementPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const backendUrl = getBackendUrl();

  // 1. Proteksi Halaman dan Cek Peran Admin
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (sessionStatus === "unauthenticated") {
      router.push(
        `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }
    if (sessionStatus === "authenticated" && session.user?.role !== "admin") {
      setError(
        "Akses ditolak: Anda tidak memiliki izin admin untuk mengakses halaman ini."
      );
      setIsLoading(false);
    }
  }, [sessionStatus, session, router]);

  // 2. Fungsi untuk mengambil daftar semua perangkat
  const fetchDevices = useCallback(async () => {
    if (
      sessionStatus !== "authenticated" ||
      session.user?.role !== "admin" ||
      !session?.user?.backendToken ||
      !backendUrl
    ) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${backendUrl}/api/devices`, {
        // Endpoint yang sudah ada
        headers: { Authorization: `Bearer ${session.user.backendToken}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `Gagal mengambil data perangkat: Status ${response.status}`,
        }));
        throw new Error(errorData.message || `Gagal mengambil data perangkat`);
      }
      const data: Device[] = await response.json();
      setDevices(data);
    } catch (err) {
      console.error("Error fetching devices:", err);
      setError(
        err instanceof Error ? err.message : "Gagal memuat daftar perangkat."
      );
      setDevices([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionStatus, session, backendUrl]);

  // Panggil fetchDevices saat komponen dimuat dan sesi admin valid
  useEffect(() => {
    if (sessionStatus === "authenticated" && session.user?.role === "admin") {
      fetchDevices();
    }
  }, [sessionStatus, session, fetchDevices]);

  // 3. Fungsi untuk menghapus perangkat (akan dipanggil dari AlertDialog)
  const handleDeleteDevice = async () => {
    if (!deviceToDelete || !backendUrl || !session?.user?.backendToken) {
      toast.error("Error", {
        description: "Tidak bisa menghapus perangkat: Informasi tidak lengkap.",
      });
      setDeviceToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(
        `${backendUrl}/api/devices/${deviceToDelete.device_id}`,
        {
          // Endpoint DELETE
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.user.backendToken}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `Gagal menghapus perangkat: Status ${response.status}`,
        }));
        throw new Error(errorData.message || "Gagal menghapus perangkat.");
      }
      // const responseData = await response.json(); // Jika backend mengembalikan data
      toast.success("Perangkat Dihapus", {
        description: `Perangkat ${
          deviceToDelete.name || deviceToDelete.device_id
        } berhasil dihapus.`,
      });
      setDevices((prevDevices) =>
        prevDevices.filter(
          (device) => device.device_id !== deviceToDelete.device_id
        )
      );
    } catch (err) {
      console.error(`Error deleting device ${deviceToDelete.device_id}:`, err);
      toast.error("Gagal Menghapus", {
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    } finally {
      setIsDeleting(false);
      setDeviceToDelete(null);
    }
  };

  // --- Render UI ---
  if (sessionStatus === "loading") {
    return (
      <main className="container mx-auto p-6 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Memuat sesi...</p>
      </main>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return null; // Akan di-redirect oleh useEffect
  }

  if (session?.user?.role !== "admin") {
    return (
      <main className="container mx-auto p-6 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <p className="text-xl font-semibold text-destructive">Akses Ditolak</p>
        <p className="text-muted-foreground mb-6">
          {error || "Anda tidak memiliki izin untuk mengakses halaman ini."}
        </p>
        <Button onClick={() => router.push("/dashboard/all")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dashboard
        </Button>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 pb-4 lg:px-6 lg:pb-6 space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center">
            <ListChecks className="mr-3 h-7 w-7 text-primary" /> Manajemen
            Perangkat
          </h1>
          <p className="text-muted-foreground text-sm">
            Kelola semua perangkat IoT yang terdaftar dalam sistem.
          </p>
        </div>
        <Link href="/dashboard/admin/devices/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Perangkat Baru
          </Button>
        </Link>
      </header>

      {isLoading && (
        <div className="text-center py-10">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">
            Memuat daftar perangkat...
          </p>
        </div>
      )}

      {!isLoading && error && (
        <Card className="mt-6 text-center py-10">
          <CardContent>
            <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3" />
            <p className="font-semibold text-destructive">
              Gagal Memuat Perangkat
            </p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && devices.length === 0 && (
        <Card className="mt-6 text-center py-10">
          <CardContent>
            <ListChecks className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-semibold">Belum Ada Perangkat</p>
            <p className="text-sm text-muted-foreground">
              Tidak ada perangkat yang terdaftar. Silakan tambahkan perangkat
              baru.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && devices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Perangkat IoT</CardTitle>
            <CardDescription>
              Total {devices.length} perangkat terdaftar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px] sm:w-[200px]">
                    Device ID
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Lokasi</TableHead>
                  <TableHead className="hidden lg:table-cell">Status</TableHead>

                  <TableHead className="text-right w-[180px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.device_id}>
                    <TableCell className="font-mono text-xs truncate">
                      {device.device_id}
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      {device.location || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {device.is_offline ? (
                        <Badge
                          variant="secondary"
                          className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        >
                          <WifiOff className="mr-1.5 h-3.5 w-3.5" /> Offline
                        </Badge>
                      ) : (
                        <Badge
                          variant="default"
                          className="bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200 border border-green-300 dark:border-green-600"
                        >
                          <Wifi className="mr-1.5 h-3.5 w-3.5" /> Online
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right space-x-1">
                      <Link
                        href={`/dashboard/device/${device.device_id}`}
                        passHref
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          title="Lihat Detail"
                        >
                          Detail
                        </Button>
                      </Link>
                      <Link
                        href={`/dashboard/admin/devices/edit/${device.device_id}`}
                        passHref
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          title="Edit Perangkat"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs"
                        title="Hapus Perangkat"
                        onClick={() => setDeviceToDelete(device)}
                        disabled={
                          isDeleting &&
                          deviceToDelete?.device_id === device.device_id
                        }
                      >
                        {isDeleting &&
                        deviceToDelete?.device_id === device.device_id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* AlertDialog untuk Konfirmasi Hapus Perangkat */}
      {deviceToDelete && (
        <AlertDialog
          open={!!deviceToDelete}
          onOpenChange={(open) => !open && setDeviceToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="text-red-500 mr-2" />
                Konfirmasi Hapus Perangkat
              </AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus perangkat{" "}
                <span className="font-semibold">
                  {deviceToDelete.name || deviceToDelete.device_id}
                </span>
                ? Semua data terkait perangkat ini mungkin juga akan
                terpengaruh. Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteDevice}
                className="bg-destructive hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Ya, Hapus Perangkat
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </main>
  );
}
