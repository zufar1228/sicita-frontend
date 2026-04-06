"use client"; // Diperlukan karena CVA

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Gaya Dasar (tidak ada perubahan di sini)
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 ease-in-out disabled:pointer-events-none disabled:opacity-50 outline-none transform-gpu",
  {
    variants: {
      variant: {
        // Gaya default dengan trik border transparan
        default:
          "bg-background text-foreground shadow-neumorphic " +
          // Tambahkan border transparan di keadaan normal
          "border-2 border-transparent " +
          // Saat hover, cukup ubah warnanya
          "hover:shadow-md hover:border-border hover:text-primary " +
          "active:shadow-neumorphic-inset active:scale-[0.98]",

        // Varian Secondary juga mendapatkan pembaruan yang sama
        secondary:
          "bg-background text-foreground shadow-neumorphic " +
          "border-2 border-transparent " +
          "hover:shadow-md hover:border-border hover:text-primary " +
          "active:shadow-neumorphic-inset active:scale-[0.98]",

        // Varian lain tidak berubah
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]",
        outline:
          "border-none bg-background text-foreground hover:shadow-neumorphic-inset active:scale-[0.98]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-4",
        lg: "h-12 rounded-xl px-7",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
