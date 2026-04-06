// components/AuthStatus.tsx
"use client";

import { useSession, signOut } from "@/hooks/useSession";
import Link from "next/link";
import { Button } from "@/components/ui/button"; // Asumsi Anda menggunakan shadcn/ui button

export default function AuthStatus() {
  const { data: session, status } = useSession(); // status bisa 'loading', 'authenticated', 'unauthenticated'

  if (status === "loading") {
    return <p className="text-sm text-gray-500">Memuat sesi...</p>;
  }

  if (status === "authenticated") {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm">
          Halo,{" "}
          <span className="font-semibold">
            {session.user?.name || session.user?.email || "Pengguna"}
          </span>
          !{/* Tampilkan peran jika ada dan Anda ingin menampilkannya */}
          {/* {session.user?.role && <span className="text-xs text-gray-600 ml-1">({session.user.role})</span>} */}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/" })} // Arahkan ke homepage setelah logout
        >
          Logout
        </Button>
      </div>
    );
  }

  // status === "unauthenticated"
  return (
    <div className="flex items-center gap-3">
      <Link href="/login" passHref>
        <Button variant="ghost" size="sm">
          Login
        </Button>
      </Link>
      <Link href="/register" passHref>
        <Button variant="default" size="sm">
          Daftar
        </Button>
      </Link>
    </div>
  );
}
