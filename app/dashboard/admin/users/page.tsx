// app/dashboard/admin/users/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { getBackendUrl } from "@/lib/demo/utils";
import { AppUser } from "@/types/user"; // Sesuaikan path jika perlu
import {
  Table,
  TableBody,
  // TableCaption, // Tidak terpakai, bisa dihapus jika tidak ada rencana penggunaan
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link"; // Impor Link
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import {
  Users,
  Filter,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  UserCheck,
  UserX,
  Edit3,
  UserPlus, // Impor ikon UserPlus
} from "lucide-react";

export default function UserManagementPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");

  const [processingUserId, setProcessingUserId] = useState<number | null>(null);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

  const backendUrl = getBackendUrl();

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

  const fetchUsers = useCallback(async () => {
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
      const queryParams = new URLSearchParams();
      if (filterStatus === "active") queryParams.append("is_active", "true");
      if (filterStatus === "pending") queryParams.append("is_active", "false");
      if (filterRole !== "all") queryParams.append("role", filterRole);

      const response = await fetch(
        `${backendUrl}/api/users?${queryParams.toString()}`,
        {
          headers: { Authorization: `Bearer ${session.user.backendToken}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `Gagal mengambil data pengguna: Status ${response.status}`,
        }));
        throw new Error(errorData.message || `Gagal mengambil data pengguna`);
      }
      const data: AppUser[] = await response.json();
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(
        err instanceof Error ? err.message : "Gagal memuat daftar pengguna."
      );
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionStatus, session, backendUrl, filterStatus, filterRole]);

  useEffect(() => {
    if (sessionStatus === "authenticated" && session.user?.role === "admin") {
      fetchUsers();
    }
  }, [sessionStatus, session, fetchUsers]);

  const handleApproveUser = async (userId: number) => {
    if (!backendUrl || !session?.user?.backendToken) {
      toast.error("Error Konfigurasi", {
        description: "Tidak bisa menghubungi server.",
      });
      return;
    }
    setProcessingUserId(userId);
    try {
      const response = await fetch(
        `${backendUrl}/api/users/${userId}/approve`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.user.backendToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `Gagal menyetujui pengguna: Status ${response.status}`,
        }));
        throw new Error(errorData.message || `Gagal menyetujui pengguna`);
      }
      toast.success("Pengguna Disetujui", {
        description: `Pengguna ID: ${userId} telah diaktifkan.`,
      });
      fetchUsers();
    } catch (err) {
      console.error(`Error approving user ${userId}:`, err);
      toast.error("Gagal Menyetujui", {
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleDeleteUserInitiate = (user: AppUser) => {
    if (session?.user?.id === String(user.id)) {
      toast.error("Aksi Tidak Diizinkan", {
        description: "Anda tidak dapat menghapus akun Anda sendiri.",
      });
      return;
    }
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete || !backendUrl || !session?.user?.backendToken) {
      setUserToDelete(null);
      return;
    }
    setProcessingUserId(userToDelete.id);
    try {
      const response = await fetch(
        `${backendUrl}/api/users/${userToDelete.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.user.backendToken}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `Gagal menghapus pengguna: Status ${response.status}`,
        }));
        throw new Error(errorData.message || `Gagal menghapus pengguna`);
      }
      toast.success("Pengguna Dihapus", {
        description: `Pengguna ${userToDelete.username} (ID: ${userToDelete.id}) berhasil dihapus.`,
      });

      // PERUBAHAN DI SINI: Panggil fetchUsers() untuk data terbaru.
      fetchUsers();
    } catch (err) {
      console.error(`Error deleting user ${userToDelete.id}:`, err);
      toast.error("Gagal Menghapus", {
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    } finally {
      setProcessingUserId(null);
      setUserToDelete(null);
    }
  };

  if (sessionStatus === "loading") {
    return (
      <main className="container mx-auto p-6 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Memuat sesi...</p>
      </main>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return (
      <main className="container mx-auto p-4 text-center">
        <p className="text-muted-foreground">Mengalihkan ke halaman login...</p>
      </main>
    );
  }

  if (
    session!.user?.role !== "admin" ||
    (error && users.length === 0 && !isLoading)
  ) {
    return (
      <main className="container mx-auto p-6 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <p className="text-xl font-semibold text-destructive">
          {error || "Akses Ditolak"}
        </p>
        <p className="text-muted-foreground mb-6">
          {error
            ? "Tidak dapat memuat data pengguna."
            : "Anda tidak memiliki izin untuk mengakses halaman ini."}
        </p>
        <Button onClick={() => router.push("/dashboard/all")}>
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
            <Users className="mr-3 h-7 w-7 text-primary" /> Manajemen Pengguna
          </h1>
          <p className="text-muted-foreground text-sm">
            Kelola semua akun pengguna dalam sistem.
          </p>
        </div>
        {/* === TOMBOL TAMBAH PENGGUNA BARU === */}
        <Link href="/dashboard/admin/users/new" passHref>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" /> Tambah Pengguna Baru
          </Button>
        </Link>
        {/* =================================== */}
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Filter className="mr-2 h-5 w-5" /> Filter Pengguna
          </CardTitle>
          <CardDescription>
            Saring daftar pengguna berdasarkan status atau peran.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 pt-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="filterStatus" className="text-xs">
              Status Akun
            </Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger id="filterStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="pending">Menunggu Persetujuan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="filterRole" className="text-xs">
              Peran (Role)
            </Label>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger id="filterRole">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Peran</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading && users.length === 0 && (
        <div className="text-center py-10">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">
            Memuat daftar pengguna...
          </p>
        </div>
      )}

      {!isLoading && error && users.length === 0 && (
        <Card className="mt-6 text-center py-10">
          <CardContent>
            <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3" />
            <p className="font-semibold text-destructive">
              Gagal Memuat Pengguna
            </p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && users.length === 0 && (
        <Card className="mt-6 text-center py-10">
          <CardContent>
            <Users className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-semibold">Tidak Ada Pengguna Ditemukan</p>
            <p className="text-sm text-muted-foreground">
              Tidak ada pengguna yang cocok dengan filter Anda, atau belum ada
              pengguna terdaftar.
            </p>
          </CardContent>
        </Card>
      )}

      {users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Pengguna</CardTitle>
            <CardDescription>
              Total {users.length} pengguna ditemukan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tgl. Daftar</TableHead>
                  <TableHead className="text-right w-[250px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    className={
                      !user.is_active
                        ? "bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-950/50"
                        : ""
                    }
                  >
                    <TableCell>{user.id}</TableCell>
                    <TableCell className="font-medium">
                      {user.username}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === "admin" ? "destructive" : "outline"
                        }
                        className={
                          user.role === "admin"
                            ? "border-red-600 text-red-700 dark:text-red-300 dark:border-red-500"
                            : "border-blue-600 text-blue-700 dark:text-blue-300 dark:border-blue-500"
                        }
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <Badge className="bg-green-500 hover:bg-green-600 text-white">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-yellow-500 hover:bg-yellow-600 text-white"
                        >
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {!user.is_active && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApproveUser(user.id)}
                          disabled={processingUserId === user.id}
                          className="bg-green-600 hover:bg-green-700 hover:text-black text-white"
                        >
                          {processingUserId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                          <span className="ml-1.5">Setujui</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        disabled={
                          processingUserId === user.id ||
                          (user.role === "admin" && user.is_active) // <-- Diubah di sini
                        }
                        onClick={() =>
                          router.push(`/dashboard/admin/users/edit/${user.id}`)
                        }
                      >
                        <Edit3 className="h-4 w-4" />{" "}
                        <span className="ml-1.5">Edit</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUserInitiate(user)}
                        disabled={
                          processingUserId === user.id ||
                          session?.user?.id === String(user.id) ||
                          (user.role === "admin" && user.is_active) // <-- Diubah di sini
                        }
                      >
                        {processingUserId === user.id &&
                        userToDelete?.id === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserX className="h-4 w-4" />
                        )}
                        <span className="ml-1.5">Hapus</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {userToDelete && (
        <AlertDialog
          open={!!userToDelete}
          onOpenChange={(open) => !open && setUserToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="text-red-500 mr-2" />
                Konfirmasi Hapus Pengguna
              </AlertDialogTitle>
              <AlertDialogDescription>
                Pengguna{" "}
                <span className="font-semibold">{userToDelete.username}</span>{" "}
                (ID: {userToDelete.id}) akan dihapus secara permanen. Tindakan
                ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={processingUserId === userToDelete.id}
              >
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteUser}
                className="bg-destructive hover:bg-destructive/90"
                disabled={processingUserId === userToDelete.id}
              >
                {processingUserId === userToDelete.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Ya, Hapus Pengguna
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </main>
  );
}
