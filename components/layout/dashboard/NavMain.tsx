// components/layout/dashboard/NavMain.tsx
"use client";

import Link from "next/link";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"; // Sesuaikan path
import { cn } from "@/lib/utils"; // Pastikan Anda memiliki fungsi cn (dari shadcn/ui)
import type { NavItemType } from "@/types/navigation"; // Sesuaikan path

export interface NavMainProps {
  items: NavItemType[];
}

export function NavMain({ items }: NavMainProps) {
  if (!items || items.length === 0) {
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
                item.isActive && "bg-accent text-accent-foreground" // Contoh styling untuk item aktif
              )}
              variant={item.isActive ? "default" : undefined} // Atur variant berdasarkan isActive
              asChild // Penting jika SidebarMenuButton merender <button>
            >
              <div>
                {item.icon && <item.icon className="mr-2 h-5 w-5" />}
                <span>{item.label}</span>
              </div>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
