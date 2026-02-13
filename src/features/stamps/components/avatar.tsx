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
  gold: "ring-2 ring-chart-1/60 ring-offset-1 ring-offset-background",
  silver:
    "ring-2 ring-muted-foreground/40 ring-offset-1 ring-offset-background",
  bronze: "ring-2 ring-chart-4/40 ring-offset-1 ring-offset-background",
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
          "bg-muted font-medium text-muted-foreground",
          fallbackTextSizes[size]
        )}
      >
        {fallback.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </ShadcnAvatar>
  );
}
