// app/dashboard/admin/users/edit/[userId]/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { getBackendUrl } from "@/lib/demo/utils";
import { AppUser, UserRole } from "@/types/user"; // Pastikan UserRole diekspor dari types/user
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch"; // Untuk status is_active
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, AlertTriangle, UserCog } from "lucide-react";

// Jika UserRole belum ada di types/user.ts, Anda bisa definisikan di sini atau di sana:
// export type UserRole = "admin" | "user";

interface EditableUserData {
  username: string;
  email: string; // Mungkin ingin dibuat read-only jika email adalah identifier utama
  role: UserRole;
  is_active: boolean;
  // Tambahkan field lain yang bisa diedit jika ada, misal: name/full_name
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string | undefined;
  const { data: session, status: sessionStatus } = useSession();

  const [userData, setUserData] = useState<EditableUserData | null>(null);
  const [initialUserData, setInitialUserData] =
    useState<EditableUserData | null>(null); // Untuk cek perubahan
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      setError("Akses ditolak: Anda tidak memiliki izin admin.");
      setIsLoading(false);
    }
  }, [sessionStatus, session, router]);

  // 2. Fetch data pengguna yang akan diedit
  const fetchUserToEdit = useCallback(async () => {
    if (
      !userId ||
      sessionStatus !== "authenticated" ||
      session.user?.role !== "admin" ||
      !session?.user?.backendToken ||
      !backendUrl
    ) {
      if (sessionStatus === "authenticated" && session.user?.role !== "admin") {
        // Error sudah di-set oleh useEffect di atas
      } else if (!userId) {
        setError("ID Pengguna tidak valid.");
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${backendUrl}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${session.user.backendToken}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `Gagal mengambil data pengguna (ID: ${userId}). Status: ${response.status}`,
        }));
        throw new Error(errorData.message);
      }
      const fetchedUser: AppUser = await response.json();
      const editableData: EditableUserData = {
        username: fetchedUser.username,
        email: fetchedUser.email,
        role: fetchedUser.role as UserRole, // Pastikan tipe AppUser punya role yang kompatibel
        is_active: fetchedUser.is_active,
      };
      setUserData(editableData);
      setInitialUserData(editableData); // Simpan data awal
    } catch (err) {
      console.error("Error fetching user for edit:", err);
      setError(
        err instanceof Error ? err.message : "Gagal memuat data pengguna."
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId, sessionStatus, session, backendUrl]);

  useEffect(() => {
    if (
      userId &&
      sessionStatus === "authenticated" &&
      session.user?.role === "admin"
    ) {
      fetchUserToEdit();
    }
  }, [userId, sessionStatus, session, fetchUserToEdit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSelectChange = (
    name: keyof EditableUserData,
    value: string | boolean
  ) => {
    setUserData((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userData || !userId || !session?.user?.backendToken || !backendUrl) {
      toast.error("Error", {
        description: "Informasi tidak lengkap untuk menyimpan.",
      });
      return;
    }
    // Jangan biarkan admin mengubah dirinya menjadi non-admin atau menonaktifkan dirinya sendiri dari UI ini
    if (String(session.user.id) === userId) {
      if (userData.role !== "admin") {
        toast.error("Aksi Tidak Diizinkan", {
          description:
            "Anda tidak dapat mengubah peran akun Anda sendiri menjadi non-admin.",
        });
        // Reset ke peran awal jika perlu
        setUserData((prev) => (prev ? { ...prev, role: "admin" } : null));
        return;
      }
      if (!userData.is_active) {
        toast.error("Aksi Tidak Diizinkan", {
          description: "Anda tidak dapat menonaktifkan akun Anda sendiri.",
        });
        setUserData((prev) => (prev ? { ...prev, is_active: true } : null));
        return;
      }
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`${backendUrl}/api/users/${userId}`, {
        method: "PATCH", // atau PUT jika Anda mengganti seluruh resource
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.backendToken}`,
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `Gagal memperbarui pengguna. Status: ${response.status}`,
        }));
        throw new Error(errorData.message);
      }
      const updatedUser: AppUser = await response.json();
      toast.success("Pengguna Diperbarui", {
        description: `Data untuk ${updatedUser.username} berhasil disimpan.`,
      });
      setInitialUserData(userData); // Update data awal agar tombol save disable
      // Opsional: router.push('/dashboard/admin/users'); // Kembali ke daftar pengguna
    } catch (err) {
      console.error("Error updating user:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Gagal menyimpan perubahan.";
      setError(errorMessage);
      toast.error("Gagal Menyimpan", { description: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    JSON.stringify(userData) !== JSON.stringify(initialUserData);

  // --- Render Logic ---
  if (isLoading && !userData) {
    return (
      <div className="container mx-auto p-6 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Memuat data pengguna...</p>
      </div>
    );
  }

  // Error karena akses ditolak atau fetch gagal
  if (
    error &&
    (!userData ||
      (sessionStatus === "authenticated" && session.user?.role !== "admin"))
  ) {
    return (
      <main className="container mx-auto p-6 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <p className="text-xl font-semibold text-destructive">
          {sessionStatus === "authenticated" && session.user?.role !== "admin"
            ? "Akses Ditolak"
            : "Gagal Memuat Data"}
        </p>
        <p className="text-muted-foreground mb-6">
          {error || "Anda tidak memiliki izin untuk mengakses halaman ini."}
        </p>
        <Button onClick={() => router.push("/dashboard/admin/users")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Manajemen Pengguna
        </Button>
      </main>
    );
  }

  if (!userData) {
    // Jika tidak loading, tidak error, tapi userData masih null (misal ID tidak valid)
    return (
      <main className="container mx-auto p-6 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
        <p className="text-xl font-semibold">Pengguna Tidak Ditemukan</p>
        <p className="text-muted-foreground mb-6">
          Pengguna dengan ID yang diminta tidak dapat ditemukan.
        </p>
        <Button onClick={() => router.push("/dashboard/admin/users")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Manajemen Pengguna
        </Button>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 pb-4 lg:px-6 lg:pb-6 space-y-6">
      <div className="mb-6">
        <Button onClick={() => router.push("/dashboard/admin/users")} size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Manajemen Pengguna
        </Button>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <UserCog className="mr-3 h-6 w-6 text-primary" />
            Edit Pengguna: {initialUserData?.username || userId}
          </CardTitle>
          <CardDescription>
            Perbarui informasi pengguna di bawah ini.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                value={userData.username}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={userData.email}
                onChange={handleInputChange}
                // Email hanya nonaktif jika role target adalah admin DAN sudah aktif
                readOnly={userData.role === "admin" && userData.is_active}
                className={
                  userData.role === "admin" && userData.is_active
                    ? "bg-muted/50 cursor-not-allowed"
                    : ""
                }
              />
              {/* Tampilkan pesan yang sesuai berdasarkan role dan status */}
              {userData.role === "admin" && userData.is_active ? (
                <p className="text-xs text-muted-foreground">
                  Email untuk akun admin yang aktif tidak dapat diubah.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Pastikan email yang dimasukkan valid dan unik.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Peran (Role)</Label>
              <Select
                value={userData.role}
                onValueChange={(value) =>
                  handleSelectChange("role", value as UserRole)
                }
                disabled={String(session?.user?.id) === userId} // Admin tidak bisa ubah role sendiri
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Pilih peran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {String(session?.user?.id) === userId && (
                <p className="text-xs text-muted-foreground">
                  Anda tidak dapat mengubah peran akun Anda sendiri.
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3 mb-6">
              <Switch
                id="is_active"
                checked={userData.is_active}
                onCheckedChange={(checked) =>
                  handleSelectChange("is_active", checked)
                }
                disabled={String(session?.user?.id) === userId} // Admin tidak bisa nonaktifkan diri sendiri
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Akun Aktif
              </Label>
              {String(session?.user?.id) === userId && (
                <p className="text-xs text-muted-foreground">
                  (Tidak dapat menonaktifkan akun sendiri)
                </p>
              )}
            </div>
            {/* TODO: Tambahkan bagian untuk "Ubah Password" jika diperlukan. 
                Ini biasanya melibatkan field password baru dan konfirmasi,
                dan mungkin password admin saat ini untuk otorisasi.
            */}
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Button
              type="submit"
              disabled={
                isSaving ||
                !hasChanges ||
                (String(session?.user?.id) === userId &&
                  (userData.role !== "admin" || !userData.is_active))
              }
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Simpan Perubahan
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
