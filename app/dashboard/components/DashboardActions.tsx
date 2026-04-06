// app/dashboard/components/DashboardActions.tsx

"use client";

import * as React from "react";
import { BellIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import PushSubscriptionControls from "./PushSubscriptionControls"; // Pastikan path ini benar

export default function DashboardActions() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* Tombol ikon sebagai pemicu Popover */}
        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
          <BellIcon className="h-5 w-5" />
          <span className="sr-only">Buka Pengaturan Notifikasi</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Notifikasi Push</h4>
            <p className="text-sm text-muted-foreground">
              Aktifkan untuk menerima pembaruan dan peringatan penting langsung
              di perangkat Anda.
            </p>
          </div>
          <div className="grid gap-2">
            {/* Komponen Anda ditempatkan di sini */}
            <PushSubscriptionControls />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
