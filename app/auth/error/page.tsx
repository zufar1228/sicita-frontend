// app/auth/error/page.tsx
import React, { Suspense } from "react"; // Impor Suspense
import AuthErrorClientContent from "./AuthErrorClientContent"; // Impor komponen klien baru
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"; // Impor komponen Card untuk fallback jika diperlukan

// Komponen Fallback UI sederhana saat konten sedang dimuat
function LoadingErrorFallback() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md text-center shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-700 dark:text-gray-300">
            Memuat Informasi Error...
          </CardTitle>
          <CardDescription>Harap tunggu sebentar.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-2"></div>
        </CardFooter>
      </Card>
    </main>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<LoadingErrorFallback />}>
      <AuthErrorClientContent />
    </Suspense>
  );
}
