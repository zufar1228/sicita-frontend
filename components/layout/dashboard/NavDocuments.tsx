// components/layout/dashboard/NavDocuments.tsx
"use client";

import Link from "next/link";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"; // Sesuaikan path
import { cn } from "@/lib/utils"; // Pastikan Anda memiliki fungsi cn
import type { NavItemType } from "@/types/navigation"; // Sesuaikan path

export interface NavDocumentsProps {
  items: NavItemType[]; // Menggunakan tipe NavItemType yang sama untuk konsistensi
}

export function NavDocuments({ items }: NavDocumentsProps) {
  if (!items || items.length === 0) {
    // Anda bisa mengembalikan null atau pesan jika tidak ada item
    // return <p className="px-4 text-xs text-muted-foreground">Tidak ada dokumen.</p>;
    return null;
  }

  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.label}>
          <Link href={item.href} passHref>
            <SidebarMenuButton
              className={cn(
                "w-full justify-start",
                item.isActive && "bg-accent text-accent-foreground"
              )}
              variant={item.isActive ? "default" : undefined}
              asChild
            >
              <>
                {item.icon && <item.icon className="mr-2 h-5 w-5" />}
                <span>{item.label}</span>
              </>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
