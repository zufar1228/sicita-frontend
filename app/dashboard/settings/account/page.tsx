// app/dashboard/settings/account/page.tsx
"use client";

import React, { useEffect, useState } from "react";
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
import { toast } from "sonner";
import { Save, KeyRound, UserCircle, Loader2 } from "lucide-react";

// Skema Zod untuk validasi form profil (menggunakan username)
const profileFormSchema = z.object({
  username: z
    .string()
    .min(3, { message: "Username minimal 3 karakter." })
    .max(50, { message: "Username maksimal 50 karakter." })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: "Username hanya boleh berisi huruf, angka, dan underscore (_).",
    })
    .optional(),
});
type ProfileFormData = z.infer<typeof profileFormSchema>;

// Skema Zod untuk validasi form ubah kata sandi
const passwordFormSchema = z
  .object({
    current_password: z
      .string()
      .min(1, { message: "Kata sandi saat ini wajib diisi." }),
    new_password: z
      .string()
      .min(6, { message: "Kata sandi baru minimal 6 karakter." }),
    confirm_password: z
      .string()
      .min(6, { message: "Konfirmasi kata sandi baru minimal 6 karakter." }),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Kata sandi baru dan konfirmasi tidak cocok.",
    path: ["confirm_password"],
  });
type PasswordFormData = z.infer<typeof passwordFormSchema>;

// Helper untuk mengekstrak pesan error dengan aman
interface ErrorWithMessage {
  message?: string;
  [key: string]: unknown;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Terjadi kesalahan yang tidak diketahui.";
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const {
    data: session,
    status: sessionStatus,
    update: nextAuthSessionUpdate,
  } = useSession();

  const [isProfileSubmitting, setIsProfileSubmitting] =
    useState<boolean>(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] =
    useState<boolean>(false);

  const backendUrl = getBackendUrl();

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: session?.user?.username || "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  useEffect(() => {
    if (session?.user) {
      const currentUsername = session.user?.username;
      if (currentUsername !== profileForm.getValues("username")) {
        profileForm.reset({
          username: currentUsername || "",
        });
      }
    }
  }, [session, profileForm]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (sessionStatus === "unauthenticated") {
      router.push(
        `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
      );
    }
  }, [sessionStatus, router]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!session?.user?.backendToken || !backendUrl) {
      toast.error("Error", {
        description: "Sesi tidak valid atau konfigurasi backend hilang.",
      });
      return;
    }
    setIsProfileSubmitting(true);
    try {
      const payload: { username?: string } = {};
      const currentUsername = session?.user?.username;

      if (
        data.username &&
        data.username.trim() &&
        data.username !== currentUsername
      ) {
        payload.username = data.username;
      } else if (
        data.username === "" &&
        currentUsername &&
        currentUsername !== ""
      ) {
        // Opsi: kirim "" atau null jika user mengosongkan field yang ada isinya
        // payload.username = ""; // atau null, tergantung API
      }

      // Hanya submit jika ada perubahan yang akan dikirim di payload
      // atau jika username diubah menjadi kosong (jika itu adalah aksi yang valid)
      const isUsernameIntentionallyCleared =
        data.username === "" && currentUsername !== "";
      if (
        Object.keys(payload).length === 0 &&
        !isUsernameIntentionallyCleared &&
        data.username === currentUsername
      ) {
        toast.info("Tidak Ada Perubahan", {
          description: "Tidak ada informasi profil yang diubah.",
        });
        setIsProfileSubmitting(false);
        return;
      }
      // Jika username dikosongkan dan Anda ingin mengirimnya sebagai string kosong
      if (isUsernameIntentionallyCleared && !payload.username) {
        // payload.username = ""; // Uncomment jika ini adalah perilaku yang diinginkan
      }

      const response = await fetch(`${backendUrl}/api/users/me/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.backendToken}`,
        },
        body: JSON.stringify(payload),
      });

      const responseData: ErrorWithMessage & {
        user?: { username?: string; email?: string };
      } = await response
        .json()
        .catch(() => ({ message: "Respons tidak valid dari server." }));

      if (!response.ok) {
        const errorMessage =
          getErrorMessage(responseData) || "Gagal memperbarui profil.";
        if (
          response.status === 409 ||
          errorMessage.toLowerCase().includes("username already exists") ||
          errorMessage.toLowerCase().includes("sudah digunakan")
        ) {
          profileForm.setError("username", {
            type: "manual",
            message: errorMessage.includes("Username ini sudah digunakan.")
              ? errorMessage
              : "Username ini sudah digunakan.",
          });
        }
        throw new Error(errorMessage);
      }

      const updatedUser = responseData.user || responseData;
      const sessionUpdateData: { username?: string } = {};

      if (updatedUser.username !== undefined) {
        sessionUpdateData.username =
          typeof updatedUser.username === "string"
            ? updatedUser.username
            : undefined;
      }

      if (Object.keys(sessionUpdateData).length > 0) {
        await nextAuthSessionUpdate(sessionUpdateData);
      }

      toast.success("Profil Diperbarui", {
        description: "Informasi profil Anda berhasi diperbarui.",
      });
      profileForm.reset({
        username:
          typeof updatedUser.username === "string" ? updatedUser.username : "",
      });
    } catch (err: unknown) {
      console.error("Error updating profile:", err);
      const message = getErrorMessage(err);
      if (!message.toLowerCase().includes("username ini sudah digunakan")) {
        toast.error("Gagal Update Profil", {
          description: message,
        });
      }
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (!session?.user?.backendToken || !backendUrl) {
      toast.error("Error", {
        description: "Sesi tidak valid atau konfigurasi backend hilang.",
      });
      return;
    }
    setIsPasswordSubmitting(true);
    try {
      const response = await fetch(
        `${backendUrl}/api/users/me/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.user.backendToken}`,
          },
          body: JSON.stringify({
            currentPassword: data.current_password,
            newPassword: data.new_password,
          }),
        }
      );

      const responseData: ErrorWithMessage = await response
        .json()
        .catch(() => ({ message: "Respons tidak valid dari server." }));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(responseData) || "Gagal mengubah kata sandi."
        );
      }

      toast.success("Kata Sandi Diperbarui", {
        description: "Kata sandi Anda berhasil diubah.",
      });
      passwordForm.reset();
    } catch (err: unknown) {
      console.error("Error changing password:", err);
      // --- PERBAIKAN PADA BARIS SEKITAR 248 ---
      const descriptionMessage: string = getErrorMessage(err); // 1. Simpan ke variabel dengan tipe string eksplisit
      toast.error("Gagal Ubah Password", {
        description: descriptionMessage, // 2. Gunakan variabel tersebut
      });
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  if (sessionStatus === "loading" || !session?.user) {
    return (
      <main className="container mx-auto p-6 flex justify-center items-center min-h-[calc(100vh-150px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="container mx-auto p-4 lg:p-6 space-y-8 max-w-3xl">
      <header className="mb-2">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center">
          <UserCircle className="mr-3 h-7 w-7 text-primary" /> Pengaturan Akun
          Saya
        </h1>
        <p className="text-muted-foreground text-sm">
          Kelola informasi profil dan keamanan akun Anda.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Profil</CardTitle>
          <CardDescription>Perbarui username Anda.</CardDescription>
        </CardHeader>
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={profileForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Username Anda"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Username ini akan ditampilkan dan digunakan untuk
                      identifikasi.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    value={session.user?.email || ""}
                    readOnly
                    className="bg-muted/50 cursor-not-allowed"
                  />
                </FormControl>
                <FormDescription>
                  Email tidak dapat diubah. Hubungi admin jika perlu perubahan.
                </FormDescription>
              </FormItem>
            </CardContent>
            <CardFooter className="border-t pt-6 mt-6">
              <Button
                type="submit"
                disabled={isProfileSubmitting || !profileForm.formState.isDirty}
              >
                {isProfileSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Simpan Perubahan Profil
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {session.user?.provider && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <KeyRound className="mr-2 h-5 w-5" />
              Ubah Kata Sandi
            </CardTitle>
            <CardDescription>
              Masukkan kata sandi Anda saat ini dan kata sandi baru.
            </CardDescription>
          </CardHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
              <CardContent className="space-y-6">
                <FormField
                  control={passwordForm.control}
                  name="current_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kata Sandi Saat Ini</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Kata sandi Anda saat ini"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="new_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kata Sandi Baru</FormLabel>
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
                  control={passwordForm.control}
                  name="confirm_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Konfirmasi Kata Sandi Baru</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Ulangi kata sandi baru"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="border-t pt-6 mt-6">
                <Button type="submit" disabled={isPasswordSubmitting}>
                  {isPasswordSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Ubah Kata Sandi
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      )}
    </main>
  );
}
