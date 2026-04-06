// app/auth/error/AuthErrorClientContent.tsx
"use client";

import { useSearchParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect } from "react"; // Anda masih bisa menggunakan useEffect jika perlu

export default function AuthErrorClientContent() {
  const searchParams = useSearchParams();
  const errorType = searchParams?.get("error"); // Ini sekarang aman karena ada di dalam komponen klien yang di-suspend

  let errorMessage =
    "Terjadi kesalahan yang tidak diketahui selama proses autentikasi.";
  let errorTitle = "Autentikasi Gagal";

  // useEffect ini bisa tetap ada jika Anda memerlukannya untuk logging atau efek samping lainnya.
  useEffect(() => {
    const currentErrorTypeFromEffect = searchParams?.get("error");
    console.log(
      "[AuthErrorClientContent] Received error type from URL:",
      currentErrorTypeFromEffect
    );
  }, [searchParams]); // searchParams adalah objek yang stabil dari hook useSearchParams

  if (errorType) {
    const decodedError = decodeURIComponent(errorType);
    switch (decodedError) {
      case "Configuration":
        errorMessage =
          "Ada masalah konfigurasi pada server autentikasi. Silakan coba lagi nanti atau hubungi admin.";
        break;
      case "AccessDenied":
        errorMessage =
          "Akses ditolak. Anda mungkin tidak memiliki izin yang cukup atau akun Anda bermasalah.";
        break;
      case "Verification":
        errorMessage = "Token verifikasi tidak valid atau sudah kedaluwarsa.";
        break;
      case "CredentialsSignin":
        errorTitle = "Login Gagal";
        errorMessage =
          "Kombinasi email/username dan password salah. Silakan periksa kembali kredensial Anda.";
        break;
      case "OAuthSignin":
      case "OAuthCallback":
      case "OAuthCreateAccount":
      case "OAuthAccountNotLinked":
      case "Callback":
        errorTitle = "Login dengan Akun Eksternal Gagal";
        errorMessage =
          "Terjadi masalah saat mencoba login dengan penyedia eksternal (misalnya Google). Akun Anda mungkin tidak terdaftar di sistem kami, belum disetujui, atau belum dapat ditautkan. Silakan coba metode login lain, daftar jika belum punya akun, atau hubungi administrator jika masalah berlanjut.";
        break;
      case "EmailCreateAccount":
      case "EmailSignin":
        errorTitle = "Login/Registrasi Email Gagal";
        errorMessage =
          "Terjadi masalah dengan proses login atau registrasi menggunakan email.";
        break;
      case "SessionRequired":
        errorMessage = "Anda harus login untuk mengakses halaman ini.";
        break;
      default:
        errorMessage = `Error: ${decodedError}. Jika ini tidak terduga, silakan hubungi dukungan.`; // Pesan default yang lebih informatif
        break;
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md text-center shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
            {errorTitle}
          </CardTitle>
          <CardDescription>
            Maaf, terjadi masalah saat mencoba autentikasi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-gray-700 dark:text-gray-300">
            {errorMessage}
          </p>
        </CardContent>
        <CardFooter className="flex flex-col items-center">
          <Link href="/login" passHref>
            <Button variant="outline">Kembali ke Halaman Login</Button>
          </Link>
          <Link href="/" passHref>
            <Button variant="link" className="mt-2">
              Pergi ke Halaman Utama
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
