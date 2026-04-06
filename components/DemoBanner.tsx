// components/DemoBanner.tsx
"use client";

import { useDemo } from "@/lib/demo/context";
import { useRouter } from "next/navigation";
import { X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DemoBanner() {
  const { isDemoMode, exitDemoMode } = useDemo();
  const router = useRouter();

  if (!isDemoMode) return null;

  return (
    <div className="bg-primary text-primary-foreground px-4 py-2 text-center text-sm flex items-center justify-center gap-2 relative z-50">
      <Eye className="h-4 w-4 shrink-0" />
      <span className="font-medium">Mode Demo</span>
      <span className="hidden sm:inline">
        — Anda menjelajahi aplikasi dengan data simulasi.
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="ml-2 h-6 px-2 text-primary-foreground hover:bg-primary-foreground/20"
        onClick={() => {
          exitDemoMode();
          router.push("/login");
        }}
      >
        <X className="h-3 w-3 mr-1" />
        Keluar Demo
      </Button>
    </div>
  );
}
