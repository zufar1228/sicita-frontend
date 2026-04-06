// app/providers/SessionProvider.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";

interface Props {
  children: React.ReactNode;
  // Anda bisa menambahkan session prop jika ingin pass initial session dari server component,
  // tapi untuk App Router, SessionProvider biasanya mengambilnya sendiri.
  // session?: any;
}

export default function NextAuthSessionProvider({ children }: Props) {
  return <SessionProvider>{children}</SessionProvider>;
}
