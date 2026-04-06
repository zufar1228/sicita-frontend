// components/layout/dashboard/NavUser.tsx
"use client";

import * as React from "react";
import { useSession, signOut } from "@/hooks/useSession";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDemo } from "@/lib/demo/context";
import {
  LogOut,
  UserCircle, // Untuk pengaturan umum di dropdown pengguna
  ChevronDown,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button"; // Untuk trigger dropdown
import { Skeleton } from "@/components/ui/skeleton";
// import { useTheme } from "next-themes"; // Jika Anda menggunakan next-themes

// Impor tipe jika diletakkan di file terpisah
import type { UserDropdownItemType } from "@/types/navigation"; // Sesuaikan path

export function NavUser() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDemoMode, exitDemoMode } = useDemo();
  // const { setTheme } = useTheme(); // Jika pakai next-themes

  const isLoading = status === "loading";

  if (isLoading) {
    return (
      <div className="flex items-center space-x-3 p-2">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Button
        onClick={() => router.push("/login")}
        variant="outline"
        className="w-full"
      >
        Login
      </Button>
    );
  }

  const { name, email, image } = session.user;
  const initials =
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?";

  const userDropdownItems: UserDropdownItemType[] = [
    {
      href: "/dashboard/settings/account",
      label: "Kelola Akun",
      icon: UserCircle,
    },
    // { href: "/settings/application", label: "Pengaturan Aplikasi", icon: Settings }, // Dipindah ke NavSecondary
    // Bisa tambahkan sub-menu untuk tema jika menggunakan next-themes
    // {
    //   label: "Ganti Tema",
    //   icon: Moon, // Atau Sun, tergantung tema saat ini
    //   children: [
    //     { label: "Light", onClick: () => setTheme("light"), icon: Sun },
    //     { label: "Dark", onClick: () => setTheme("dark"), icon: Moon },
    //     { label: "System", onClick: () => setTheme("system"), icon: Laptop },
    //   ]
    // },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-auto w-full items-center justify-between p-2 text-left"
        >
          <div className="flex items-center space-x-3">
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={image || undefined}
                alt={name || "User Avatar"}
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-sm leading-tight">
              <span className="truncate font-medium">{name || "Pengguna"}</span>
              <span className="truncate text-xs text-muted-foreground">
                {email || ""}
              </span>
            </div>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1 p-1">
            <p className="text-sm font-medium leading-none">
              {name || "Pengguna"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {email || ""}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {userDropdownItems.map((item) => (
            <DropdownMenuItem
              key={item.label}
              asChild
              className="cursor-pointer"
            >
              {item.href ? (
                // STRUKTUR YANG BENAR: <Link> menjadi anak langsung dari <DropdownMenuItem asChild>
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ) : (
                // Untuk item tanpa link (dengan onClick), tidak perlu <Link>
                <div onClick={item.onClick}>
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </div>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            if (isDemoMode) {
              exitDemoMode();
              router.push("/login");
            } else {
              signOut({ callbackUrl: "/login" });
            }
          }}
          className="cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
