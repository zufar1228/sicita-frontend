import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Gaya Dasar Neumorphic Inset
        "flex h-11 w-full min-w-0 rounded-xl border-none bg-background px-4 py-2 text-base shadow-neumorphic-inset transition-all duration-200",

        // Gaya untuk placeholder, selection, dan file input
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",

        // Gaya untuk state disabled (dibiarkan standar karena sudah efektif)
        "disabled:cursor-not-allowed disabled:opacity-50",

        // Gaya untuk state focus dan invalid (menggunakan ring, bukan border)
        "outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        "aria-invalid:ring-2 aria-invalid:ring-destructive/50",

        className
      )}
      {...props}
    />
  );
}

export { Input };
