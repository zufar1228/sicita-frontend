// components/layout/dashboard/NavSecondary.tsx
"use client";

import Link from "next/link";
import * as React from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"; // Sesuaikan path
import { cn } from "@/lib/utils"; // Pastikan Anda memiliki fungsi cn
import type { NavItemType } from "@/types/navigation"; // Sesuaikan path

export interface NavSecondaryProps
  extends React.ComponentPropsWithoutRef<typeof SidebarGroup> {
  items: NavItemType[];
}

export function NavSecondary({
  items,
  className,
  ...props
}: NavSecondaryProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <SidebarGroup className={cn(className)} {...props}>
      {/* <SidebarGroupHeader>Pengaturan</SidebarGroupHeader> // Opsional: Judul grup */}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} passHref legacyBehavior={false}>
                <SidebarMenuButton
                  className={cn(
                    "w-full justify-start",
                    item.isActive && "bg-accent text-accent-foreground"
                  )}
                  variant={item.isActive ? "default" : null}
                  asChild
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
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
