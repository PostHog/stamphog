import {
  AvatarFallback,
  AvatarImage,
  Avatar as ShadcnAvatar,
} from "~/components/ui/avatar";
import { cn } from "~/lib/utils";

const sizeClasses = {
  sm: "size-7",
  md: "size-9",
  lg: "size-14",
} as const;

const fallbackTextSizes = {
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
  size?: keyof typeof sizeClasses;
  ring?: keyof typeof ringStyles;
}) {
  return (
    <ShadcnAvatar className={cn(sizeClasses[size], ring && ringStyles[ring])}>
      {imageUrl && (
        <AvatarImage
          alt={fallback}
          referrerPolicy="no-referrer"
          src={imageUrl}
        />
      )}
      <AvatarFallback
        className={cn(
          "bg-zinc-800 font-medium text-zinc-400",
          fallbackTextSizes[size]
        )}
      >
        {fallback.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </ShadcnAvatar>
  );
}
