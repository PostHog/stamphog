import { cn } from "~/lib/utils";

const sizes = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-14 w-14",
} as const;

const textSizes = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-lg",
} as const;

const ringStyles = {
  gold: "ring-2 ring-amber-400/60 ring-offset-1 ring-offset-zinc-950",
  silver: "ring-2 ring-zinc-400/40 ring-offset-1 ring-offset-zinc-950",
  bronze: "ring-2 ring-orange-500/40 ring-offset-1 ring-offset-zinc-950",
} as const;

export function Avatar({
  imageUrl,
  fallback,
  size = "sm",
  ring,
}: {
  imageUrl?: string;
  fallback: string;
  size?: keyof typeof sizes;
  ring?: keyof typeof ringStyles;
}) {
  const base = cn(
    sizes[size],
    "shrink-0 rounded-full",
    ring && ringStyles[ring]
  );

  if (imageUrl) {
    return (
      <img
        alt={fallback}
        className={cn(base, "object-cover")}
        referrerPolicy="no-referrer"
        src={imageUrl}
      />
    );
  }

  return (
    <div
      className={cn(
        base,
        "flex items-center justify-center bg-zinc-800 font-medium text-zinc-400",
        textSizes[size]
      )}
    >
      {fallback.slice(0, 1).toUpperCase()}
    </div>
  );
}
