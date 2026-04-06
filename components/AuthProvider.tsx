// components/AuthProvider.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";

interface AuthProviderProps {
  children: React.ReactNode;
  // Anda bisa menambahkan session opsional jika ingin pass dari server component
  // session?: any;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  return <SessionProvider>{children}</SessionProvider>;
}
