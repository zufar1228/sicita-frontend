// app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Arahkan pengguna ke halaman /login saat komponen ini dimuat
    router.replace("/login");
  }, [router]);

  // Tampilkan pesan loading saat proses redirect sedang berlangsung
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p>Mengalihkan ke halaman login...</p>
    </div>
  );
}
