// hooks/useSession.ts
// Custom session hook that returns demo session when in demo mode
// Re-exports signIn and signOut with demo mode awareness
"use client";

import {
  useSession as useNextAuthSession,
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from "next-auth/react";
import type { Session } from "next-auth";
import { useDemo } from "@/lib/demo/context";
import { DEMO_SESSION } from "@/lib/demo/data";

export function useSession() {
  const nextAuth = useNextAuthSession();
  const { isDemoMode } = useDemo();

  if (isDemoMode) {
    return {
      data: DEMO_SESSION as unknown as Session,
      status: "authenticated" as const,
      update: async () => DEMO_SESSION as unknown as Session | null,
    };
  }

  return nextAuth;
}

export const signIn = nextAuthSignIn;

export function signOut(options?: { callbackUrl?: string; redirect?: boolean }) {
  return nextAuthSignOut(options);
}
