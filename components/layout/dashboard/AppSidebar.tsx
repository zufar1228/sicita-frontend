// components/layout/dashboard/AppSidebar.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import {
  LayoutDashboard,
  Users,
  Settings2,
  History,
  ListFilter,
  Settings,
  LucideIcon,
} from "lucide-react";

import { useSelectedDevice } from "../../../contexts/SelectedDeviceContext";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

import { NavMain } from "./NavMain";
import { NavSecondary } from "./NavSecondary";
import { NavUser } from "./NavUser";
import { NavDocuments } from "./NavDocuments";

import type { NavItemType } from "@/types/navigation";
import Image from "next/image";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { className, ...rest } = props;
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isLoadingSession = status === "loading";
  const userRole = session?.user?.role;

  const {
    selectedDeviceId: currentDevice,
    setSelectedDeviceId,
    availableDevices,
    isLoadingAvailableDevices,
  } = useSelectedDevice();

  // Definisi menu
  const mainDefs: Omit<NavItemType, "href" | "isActive">[] = [
    { label: "Dashboard", icon: LayoutDashboard, deviceSpecific: true },
    { label: "History Perangkat", icon: History, deviceSpecific: true },
    { label: "Kelola Perangkat", icon: Settings2, adminOnly: true },
    { label: "Manajemen User", icon: Users, adminOnly: true },
  ];

  const secondaryDefs: Omit<NavItemType, "href" | "isActive">[] = [
    { label: "Pengaturan Aplikasi", icon: Settings },
  ];

  const documentDefs: (Omit<NavItemType, "href" | "isActive" | "icon"> & {
    icon: LucideIcon;
    name: string;
  })[] = [
    // Tambahkan definisi dokumen di sini
  ];

  const buildNav = (
    items: Omit<NavItemType, "href" | "isActive">[]
  ): NavItemType[] => {
    if (isLoadingSession || !session) return [];

    return items
      .filter((i) => (i.adminOnly ? userRole === "admin" : true))
      .map((i) => {
        let href = "/";
        const devId = currentDevice || "all";

        switch (i.label) {
          case "Dashboard":
            href = `/dashboard/${devId === "all" ? "all" : `device/${devId}`}`;
            break;
          case "History Perangkat":
            href = `/dashboard/history/${devId}`;
            break;
          case "Kelola Perangkat":
            href = "/dashboard/admin/devices";
            break;
          case "Manajemen User":
            href = "/dashboard/admin/users";
            break;
          case "Pengaturan Aplikasi":
            href = "/dashboard/settings/application";
            break;
        }

        const isActive = pathname
          ? href === "/"
            ? pathname === "/"
            : pathname.startsWith(href)
          : false;

        return { ...i, href, isActive };
      });
  };

  const buildDocs = (): NavItemType[] => {
    if (isLoadingSession || !session) return [];
    return documentDefs.map((d) => {
      const slug = d.name.toLowerCase().replace(/\s+/g, "-");
      const href = `/documents/${slug}`;
      return {
        ...d,
        label: d.name,
        href,
        isActive: pathname ? pathname.startsWith(href) : false,
      };
    });
  };

  const mainNav = buildNav(mainDefs);
  const secondaryNav = buildNav(secondaryDefs);
  const documentNav = buildDocs();

  if (
    isLoadingSession ||
    (isLoadingAvailableDevices &&
      availableDevices.length === 0 &&
      pathname &&
      pathname.startsWith("/dashboard"))
  ) {
    return (
      <Sidebar
        collapsible="offcanvas"
        className={`animate-pulse ${className}`}
        {...rest}
      >
        <SidebarHeader className="p-4 border-b">
          <Skeleton className="h-7 w-7 rounded mb-2" />
          <Skeleton className="h-6 w-24 rounded" />
          <Skeleton className="h-10 w-full rounded mt-2" />
        </SidebarHeader>
        <SidebarContent className="p-4 space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </SidebarContent>
        <SidebarFooter className="p-4 border-t">
          <Skeleton className="h-12 w-full rounded" />
        </SidebarFooter>
      </Sidebar>
    );
  }

  if (!session) return null;

  const onDeviceChange = (value: string | "all") => {
    setSelectedDeviceId(value, { navigate: true });
  };

  return (
    <Sidebar collapsible="offcanvas" className={className} {...rest}>
      <SidebarHeader className="p-4 border-b flex-col">
        <Link
          href={
            !currentDevice || currentDevice === "all"
              ? "/dashboard/all"
              : `/dashboard/device/${currentDevice}`
          }
          className="flex items-center justify-center gap-2 text-lg font-semibold"
        >
          <Image
            src="/logo-light.png" // Asumsi logo light mode ada di folder /public
            alt="Logo Aplikasi"
            width={120} // Sesuaikan lebar logo Anda
            height={40} // Sesuaikan tinggi logo Anda
            className="block dark:hidden" // Tampil di light mode, sembunyi di dark mode
            priority // Prioritaskan loading logo
          />

          <Image
            src="/logo-dark.png" // Asumsi logo dark mode ada di folder /public
            alt="Logo Aplikasi"
            width={120} // Sesuaikan lebar logo Anda
            height={40} // Sesuaikan tinggi logo Anda
            className="hidden dark:block" // Sembunyi di light mode, tampil di dark mode
            priority
          />
        </Link>
        <div className="w-full mt-2">
          <Select
            value={currentDevice || "all"}
            onValueChange={onDeviceChange}
            disabled={
              availableDevices.length === 0 && !isLoadingAvailableDevices
            }
          >
            <SelectTrigger className="w-full">
              <ListFilter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Pilih Tampilan Perangkat..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel className="text-xs">Tampilan Data</SelectLabel>
                <SelectItem value="all">Semua Perangkat</SelectItem>
                {availableDevices.map((d) => (
                  <SelectItem key={d.device_id} value={d.device_id}>
                    {d.name || d.device_id}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {availableDevices.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Tidak ada perangkat tersedia.
            </p>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 flex flex-col p-4">
        {mainNav.length > 0 && <NavMain items={mainNav} />}
        {documentNav.length > 0 && (
          <div className="mt-4">
            <h3 className="px-4 text-xs uppercase text-muted-foreground font-semibold mb-1">
              Dokumen
            </h3>
            <NavDocuments items={documentNav} />
          </div>
        )}
        <div className="mt-auto">
          {secondaryNav.length > 0 && <NavSecondary items={secondaryNav} />}
        </div>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
