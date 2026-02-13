export function Avatar({
  imageUrl,
  fallback,
}: {
  imageUrl?: string;
  fallback: string;
}) {
  if (imageUrl) {
    return (
      <img
        alt={fallback}
        className="h-8 w-8 rounded-full border border-zinc-800 object-cover"
        referrerPolicy="no-referrer"
        src={imageUrl}
      />
    );
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-xs text-zinc-300">
      {fallback.slice(0, 1).toUpperCase()}
    </div>
  );
}
