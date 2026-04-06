"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";

// 1. Perubahan pada Avatar (wadah utama)
function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        // Efek bingkai cekung dengan padding dan bayangan inset
        "relative flex size-10 shrink-0 rounded-full bg-background p-1 shadow-neumorphic-inset",
        // Animasi halus saat di-hover
        "transition-transform duration-200 ease-in-out hover:scale-105",
        className
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      // Pastikan gambar juga bulat sempurna di dalam bingkai
      className={cn("aspect-square size-full rounded-full", className)}
      {...props}
    />
  );
}

// 2. Perubahan pada AvatarFallback
function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        // Ganti bg-muted menjadi bg-border agar kontras dengan bingkai
        "flex size-full items-center justify-center rounded-full bg-border",
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
