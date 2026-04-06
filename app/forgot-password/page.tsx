"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Label dari shadcn/ui
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { toast } from "sonner"; // Menggunakan sonner untuk notifikasi

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Kita akan menggunakan toast untuk feedback, jadi state error/message di sini bisa minimal
  // const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  // const [isError, setIsError] = useState<boolean>(false);

  const backendUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    // setFeedbackMessage(null);
    // setIsError(false);

    if (!backendUrl) {
      // setFeedbackMessage("URL Backend tidak dikonfigurasi.");
      // setIsError(true);
      toast.error("Error Konfigurasi", {
        description: "URL Backend tidak diatur.",
      });
      setIsLoading(false);
      return;
    }

    if (!email.trim()) {
      //  setFeedbackMessage("Alamat email tidak boleh kosong.");
      //  setIsError(true);
      toast.error("Input Tidak Valid", {
        description: "Alamat email tidak boleh kosong.",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${backendUrl}/api/auth/request-password-reset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Backend mungkin mengembalikan error spesifik (misal 400) atau error server (500)
        // Pesan dari backend (data.message) akan kita gunakan untuk toast error
        // setIsError(true);
        // setFeedbackMessage(data.message || `Gagal mengirim permintaan: Status ${response.status}`);
        toast.error("Permintaan Gagal", {
          description: data.message || "Terjadi kesalahan di server.",
        });
      } else {
        // Sukses, backend mengembalikan pesan informatif
        // setIsError(false);
        // setFeedbackMessage(data.message); // Pesan dari backend: "Permintaan reset password Anda telah diajukan..."
        toast.success("Permintaan Terkirim", {
          description: data.message || "Permintaan Anda sedang diproses.",
          duration: 7000, // Tampilkan lebih lama
        });
        setEmail(""); // Kosongkan form setelah sukses
      }
    } catch (err) {
      console.error("Forgot password submit error:", err);
      //  setIsError(true);
      //  setFeedbackMessage("Terjadi kesalahan pada jaringan atau server. Silakan coba lagi.");
      toast.error("Error Jaringan", {
        description: "Tidak dapat terhubung ke server. Silakan coba lagi.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Lupa Password</CardTitle>
          <CardDescription>
            Masukkan alamat email Anda yang terdaftar. Jika akun Anda ditemukan
            dan aktif, permintaan reset password akan diajukan untuk ditinjau
            oleh admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* {feedbackMessage && ( // Menggunakan toast, jadi ini bisa opsional
              <p className={`text-sm text-center p-3 rounded-md ${isError ? 'text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-300' : 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300'}`}>
                {feedbackMessage}
              </p>
            )} */}
            <div className="space-y-2">
              <Label htmlFor="email">Alamat Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@contoh.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Memproses..." : "Kirim Permintaan Reset"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm">
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Kembali ke Login
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
