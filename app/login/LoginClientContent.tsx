// app/login/LoginClientContent.tsx
"use client";

import { useState, FormEvent, useEffect } from "react";
import Image from "next/image";
import { signIn, useSession } from "next-auth/react"; // <-- Impor useSession
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes"; // <-- Impor useTheme
import { useDemo } from "@/lib/demo/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Loader2, Play } from "lucide-react";

const GoogleIcon = () => (
  <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
    <path
      fill="currentColor"
      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
    />
  </svg>
);

// Komponen Full-Screen Loading
function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-muted-foreground bg-muted/40">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p>{message}</p>
    </div>
  );
}

export default function LoginClientContent() {
  const { status } = useSession(); // <-- Dapatkan status sesi
  const { resolvedTheme } = useTheme(); // <-- Dapatkan tema saat ini (light/dark)
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard/all";

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { enterDemoMode, isDemoMode } = useDemo();

  // ▼▼▼ EFEK 1: Menangani redirect jika pengguna sudah login ▼▼▼
  useEffect(() => {
    if (isDemoMode) {
      router.push("/dashboard/all");
      return;
    }
    if (status === "authenticated") {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl, isDemoMode]);

  // ▼▼▼ EFEK 2: Menangani pesan error dari URL saat halaman dimuat ▼▼▼
  useEffect(() => {
    const errorFromUrl = searchParams.get("error");
    if (errorFromUrl) {
      let errorMessage = "Terjadi kesalahan yang tidak diketahui.";
      if (errorFromUrl === "CredentialsSignin") {
        errorMessage = "Email/username atau password salah.";
      } else if (errorFromUrl.toUpperCase().includes("OAUTH")) {
        errorMessage =
          "Login dengan penyedia eksternal gagal. Silakan coba lagi.";
      }
      setError(errorMessage);
      // Hapus query 'error' dari URL agar tidak muncul lagi saat refresh
      router.replace("/login", { scroll: false });
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      redirect: false,
      emailOrUsername,
      password,
    });

    setIsLoading(false);

    if (result?.error) {
      setError("Kombinasi email/username dan password salah.");
    } else if (result?.ok) {
      router.push(callbackUrl);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    await signIn("google", { callbackUrl });
  };

  const handleDemoMode = () => {
    enterDemoMode();
    router.push("/dashboard/all");
  };

  // ▼▼▼ Tampilkan layar loading jika sesi masih dicek atau sedang proses redirect ▼▼▼
  if (status === "loading" || status === "authenticated") {
    return (
      <LoadingScreen
        message={
          status === "authenticated"
            ? "Anda sudah login, mengalihkan..."
            : "Memeriksa sesi..."
        }
      />
    );
  }

  // Hanya render form jika pengguna belum terautentikasi
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex justify-center">
          <Link href="/">
            {/* ▼▼▼ Logo disederhanakan dengan `useTheme` ▼▼▼ */}
            <Image
              src={
                resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png"
              }
              alt="Logo Aplikasi"
              width={150}
              height={50}
              priority
            />
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Selamat Datang</CardTitle>
            <CardDescription>
              Login dengan kredensial atau akun Google Anda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 text-sm text-center text-destructive-foreground bg-destructive/20 p-3 rounded-md border border-destructive/30">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-4 mb-4">
              <Button
                className="w-full bg-muted-foreground text-muted hover:text-muted/80"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
              >
                {isGoogleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Lanjutkan dengan Google
              </Button>
            </div>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Atau lanjutkan dengan
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="emailOrUsername">Email atau Username</Label>
                  <Input
                    id="emailOrUsername"
                    type="text"
                    placeholder="email@contoh.com atau username"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    required
                    disabled={isLoading || isGoogleLoading}
                    autoComplete="username"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/forgot-password"
                      className="ml-auto inline-block text-sm underline"
                    >
                      Lupa password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading || isGoogleLoading}
                    autoComplete="current-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || isGoogleLoading}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Login
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Belum punya akun?{" "}
                <Link href="/register" className="underline">
                  Daftar
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-muted/40 px-2 text-muted-foreground">
              Atau
            </span>
          </div>
        </div>

        <Button
          onClick={handleDemoMode}
          variant="outline"
          className="w-full border-dashed border-2 h-12 text-base hover:bg-primary/5"
          disabled={isLoading || isGoogleLoading}
        >
          <Play className="mr-2 h-4 w-4" />
          Coba Mode Demo
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          Jelajahi semua fitur aplikasi tanpa perlu mendaftar.
        </p>

        <div className="text-muted-foreground text-center text-xs text-balance">
          Dengan melanjutkan, Anda setuju pada{" "}
          <Link href="/terms" className="underline">
            Ketentuan Layanan
          </Link>{" "}
          dan{" "}
          <Link href="/privacy" className="underline">
            Kebijakan Privasi
          </Link>{" "}
          kami.
        </div>
      </div>
    </main>
  );
}
