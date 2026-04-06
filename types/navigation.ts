// types/navigation.ts (atau di dalam AppSidebar.tsx)
import type { LucideIcon } from "lucide-react";

export interface NavItemType {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive?: boolean;
  adminOnly?: boolean;
  deviceSpecific?: boolean; // Untuk menandakan link yang butuh deviceId
  children?: NavItemType[]; // Untuk submenu jika dikembangkan nanti
}

export interface UserDropdownItemType {
  href?: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}
