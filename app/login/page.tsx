// app/login/page.tsx
import React, { Suspense } from "react";
import LoginClientContent from "./LoginClientContent"; // Impor komponen klien baru
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

// Komponen Fallback UI yang lebih detail saat konten login sedang dimuat
function LoginPageLoadingFallback() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <link rel="manifest" href="/manifest.json" />
      <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      <Card className="w-full max-w-md shadow-xl animate-pulse">
        <CardHeader className="text-center">
          <div className="h-7 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mx-auto mb-2"></div>{" "}
          {/* CardTitle */}
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>{" "}
          {/* CardDescription */}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Placeholder untuk form */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>{" "}
            {/* Label */}
            <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded"></div>{" "}
            {/* Input */}
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>{" "}
            {/* Label */}
            <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded"></div>{" "}
            {/* Input */}
          </div>
          <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>{" "}
          {/* Button Kredensial */}
          {/* Placeholder untuk separator */}
          <div className="mt-4 relative h-5 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            <div className="absolute left-1/2 -translate-x-1/2 bg-card px-2">
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>{" "}
              {/* Teks separator */}
            </div>
          </div>
          {/* Placeholder untuk tombol Google */}
          <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-full mt-4"></div>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 text-sm">
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/5"></div>{" "}
          {/* Teks link daftar */}
        </CardFooter>
      </Card>
    </main>
  );
}

// Anda bisa menamai default export ini LoginPage, atau LoginPageWrapper jika Anda lebih suka.
// Karena ini adalah file `page.tsx`, Next.js akan menganggap default export sebagai komponen halaman.
export default function LoginPage() {
  return (
    <div className="bg-secondary">
      <Suspense fallback={<LoginPageLoadingFallback />}>
        <LoginClientContent />
      </Suspense>
    </div>
  );
}
