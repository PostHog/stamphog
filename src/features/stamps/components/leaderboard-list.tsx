import type { LeaderboardRow } from "../types";
import { Avatar } from "./avatar";

export function LeaderboardList({
  rows,
  scoreKey,
  emptyText,
}: {
  rows: LeaderboardRow[];
  scoreKey: "stampsGiven" | "stampsRequested";
  emptyText: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyText}</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div
          className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2"
          key={row.actorId}
        >
          <div className="flex min-w-0 items-center gap-3">
            <Avatar fallback={row.displayName} imageUrl={row.imageUrl} />
            <div className="min-w-0">
              <p className="truncate font-medium text-sm text-zinc-100">
                {index + 1}. {row.displayName}
              </p>
            </div>
          </div>
          <p className="font-semibold text-sm text-zinc-100">
            {row[scoreKey] ?? 0} stamps
          </p>
        </div>
      ))}
    </div>
  );
}
