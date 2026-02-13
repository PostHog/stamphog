import type * as React from "react";
import { cn } from "~/lib/utils";

export function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 font-medium text-xs text-zinc-200",
        className
      )}
      {...props}
    />
  );
}
