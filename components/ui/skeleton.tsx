import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        // Ganti 'bg-accent animate-pulse' dengan gaya baru
        "rounded-md bg-border animate-shimmer",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
