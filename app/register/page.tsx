"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL; // URL base backend Anda

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!backendUrl) {
      setError("URL Backend tidak dikonfigurasi.");
      setIsLoading(false);
      toast.error("Error Konfigurasi", {
        description: "URL Backend tidak diatur.",
      });
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || `Registrasi gagal: Status ${response.status}`);
        toast.error("Registrasi Gagal", {
          description: data.message || "Silakan coba lagi.",
        });
      } else {
        // --- PERUBAHAN DI SINI ---
        toast.success("Registrasi Berhasil!", {
          description:
            "Akun Anda telah berhasil dibuat dan sedang menunggu persetujuan admin. Anda akan diarahkan ke halaman login.",
          duration: 3000, // Tampilkan toast sedikit lebih lama
        });
        // Setelah menampilkan pesan, arahkan ke halaman login setelah beberapa saat
        setTimeout(() => {
          router.push("/login");
        }, 3000); // Tunggu 3 detik sebelum redirect
        // Atau, Anda bisa langsung redirect tanpa timeout jika dirasa lebih baik:
        // router.push('/login');
        // --- AKHIR PERUBAHAN ---
      }
    } catch (err) {
      console.error("Registration submit error:", err);
      const errorMessage =
        "Terjadi kesalahan pada jaringan atau server. Silakan coba lagi.";
      setError(errorMessage);
      toast.error("Error Tidak Diketahui", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // ... (JSX untuk form registrasi Anda tetap sama) ...
    <main className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Buat Akun Baru</CardTitle>
          <CardDescription>
            Isi detail di bawah untuk mendaftar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <p className="text-sm text-center text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded-md">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="usernameunik"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Memproses..." : "Daftar"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm">
          <p>
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Login di sini
            </Link>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
