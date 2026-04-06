// app/dashboard/admin/users/new/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { getBackendUrl } from "@/lib/demo/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, UserPlus, Save, Loader2 } from "lucide-react";
import { AppUser } from "@/types/user"; // Pastikan tipe ini ada dan sesuai

// Skema Zod
const newUserFormSchema = z
  .object({
    username: z
      .string()
      .min(3, { message: "Username minimal 3 karakter." })
      .max(50, { message: "Username maksimal 50 karakter." })
      .regex(/^[a-zA-Z0-9_]+$/, {
        message:
          "Username hanya boleh berisi huruf, angka, dan underscore (_).",
      }),
    email: z.string().email({ message: "Format email tidak valid." }),
    password: z.string().min(6, { message: "Password minimal 6 karakter." }),
    confirm_password: z
      .string()
      .min(6, { message: "Konfirmasi password minimal 6 karakter." }),
    role: z.enum(["user", "admin"], { required_error: "Peran harus dipilih." }),
    is_active: z.boolean().default(true).optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Password dan konfirmasi password tidak cocok.",
    path: ["confirm_password"], // Pesan error akan muncul di field confirm_password
  });

type NewUserFormData = z.infer<typeof newUserFormSchema>;

// Definisikan tipe untuk error response dari backend jika ada struktur spesifik
interface BackendResponseError {
  message?: string;
  // Anda bisa tambahkan properti lain jika backend mengembalikannya, misal:
  // errors?: { field: string, message: string }[];
  [key: string]: unknown;
}

interface BackendSuccessResponse {
  user?: AppUser; // Asumsi backend mengembalikan user dalam properti 'user'
  // atau properti lain yang relevan
  [key: string]: unknown;
}

export default function AddNewUserPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const backendUrl = getBackendUrl();

  const form = useForm<NewUserFormData>({
    resolver: zodResolver(newUserFormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirm_password: "",
      role: "user",
      is_active: true,
    },
  });

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (sessionStatus === "unauthenticated") {
      router.push(
        `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }
    if (sessionStatus === "authenticated" && session.user?.role !== "admin") {
      toast.error("Akses Ditolak", {
        description: "Hanya admin yang dapat menambah pengguna.",
      });
      router.push("/dashboard"); // Redirect ke halaman dashboard umum atau halaman lain
    }
  }, [sessionStatus, session, router]);

  const onSubmit = async (data: NewUserFormData) => {
    if (!session?.user?.backendToken || !backendUrl) {
      toast.error("Error Konfigurasi", {
        description:
          "Tidak dapat menghubungi server. Token atau URL tidak valid.",
      });
      return;
    }
    setIsSubmitting(true);

    const { confirm_password: _confirm_password, ...payloadForBackend } = data;

    try {
      const response = await fetch(`${backendUrl}/api/users/admin-create`, {
        // Pastikan endpoint ini benar
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.backendToken}`,
        },
        body: JSON.stringify(payloadForBackend),
      });

      const responseData: BackendResponseError & BackendSuccessResponse =
        await response
          .json()
          .catch(() => ({ message: "Respons tidak valid dari server." }));

      if (!response.ok) {
        const errorMessage =
          responseData.message ||
          `Gagal menambah pengguna baru (${response.status}).`;
        // Tangani error spesifik dari backend
        if (
          errorMessage.toLowerCase().includes("username already exists") ||
          errorMessage.toLowerCase().includes("username sudah ada")
        ) {
          form.setError("username", {
            type: "manual",
            message: "Username ini sudah digunakan.",
          });
        } else if (
          errorMessage.toLowerCase().includes("email already exists") ||
          errorMessage.toLowerCase().includes("email sudah ada")
        ) {
          form.setError("email", {
            type: "manual",
            message: "Email ini sudah digunakan.",
          });
        }
        // Throw error agar bisa ditangkap oleh blok catch di bawah dan menampilkan toast umum jika belum ditangani secara spesifik
        throw new Error(errorMessage);
      }

      const newUser = responseData.user || responseData; // Sesuaikan dengan struktur respons backend Anda

      if (!newUser || !newUser.username) {
        // Jika respons sukses tapi tidak ada data user yang valid
        console.error(
          "Respons sukses namun data pengguna tidak valid:",
          responseData
        );
        throw new Error("Gagal memproses data pengguna dari server.");
      }

      toast.success("Pengguna Ditambahkan", {
        description: `Pengguna ${newUser.username} berhasil dibuat.`,
      });
      router.push("/dashboard/admin/users");
    } catch (err) {
      console.error("Error adding new user:", err);
      // Hanya tampilkan toast jika error belum di-set di form field
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (
          !msg.includes("username ini sudah digunakan") &&
          !msg.includes("email ini sudah digunakan")
        ) {
          toast.error("Gagal Menambah Pengguna", {
            description: err.message || "Terjadi kesalahan tidak terduga.",
          });
        }
      } else {
        toast.error("Gagal Menambah Pengguna", {
          description: "Terjadi kesalahan tidak terduga.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionStatus === "loading") {
    return (
      <main className="container mx-auto p-6 flex justify-center items-center min-h-[calc(100vh-150px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </main>
    );
  }
  // Pengguna yang bukan admin akan di-redirect oleh useEffect,
  // jadi tidak perlu render eksplisit di sini jika session sudah 'authenticated' tapi bukan admin.
  // Namun, untuk menghindari flash konten, pastikan useEffect berjalan sebelum render utama jika memungkinkan.
  // Atau, jika masih admin dan session loading, maka Loader2 akan tampil.
  if (sessionStatus === "authenticated" && session.user?.role !== "admin") {
    // Bisa juga tampilkan pesan "Redirecting..." atau null sambil menunggu redirect dari useEffect
    return (
      <main className="container mx-auto p-6 flex justify-center items-center min-h-[calc(100vh-150px)]">
        <p>
          Anda tidak memiliki izin untuk mengakses halaman ini. Mengalihkan...
        </p>
        <Loader2 className="ml-2 h-5 w-5 animate-spin text-primary" />
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
            <UserPlus className="mr-3 h-6 w-6 text-primary" />
            Tambah Pengguna Baru
          </CardTitle>
          <CardDescription>
            Isi detail di bawah untuk mendaftarkan pengguna baru ke sistem.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username *</FormLabel>
                    <FormControl>
                      <Input placeholder="Username unik" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="alamat@email.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password Awal *</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Minimal 6 karakter"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konfirmasi Password *</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Ulangi password awal"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peran (Role) *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih peran..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Status Akun</FormLabel>
                      <FormDescription>
                        Aktifkan akun ini secara langsung?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
            <br />
            <CardFooter className="border-t pt-6">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Simpan Pengguna Baru
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </main>
  );
}
