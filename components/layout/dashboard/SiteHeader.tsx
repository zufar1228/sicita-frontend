"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Image from "next/image";
import { useDemo } from "@/lib/demo/context";

export function SiteHeader() {
  const { isDemoMode } = useDemo();

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 size-10" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">
          SiCita
          {isDemoMode && <span className="text-primary ml-1">- mode demo</span>}
        </h1>

        <Image src="/wave.png" alt="Logo Aplikasi" width={30} height={30} />
      </div>
    </header>
  );
}

export interface SiteHeaderProps {
  className?: string;
}
