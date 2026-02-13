import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import type { LeaderboardRow } from "../types";
import { Avatar } from "./avatar";

type ScoreKey = "stampsGiven" | "stampsRequested";
type Tone = "amber" | "teal";

const medalConfig = {
  1: { ring: "gold" as const, accent: "text-amber-400" },
  2: { ring: "silver" as const, accent: "text-zinc-400" },
  3: { ring: "bronze" as const, accent: "text-orange-400" },
} as const;

const toneBarColor = {
  amber: "bg-amber-400",
  teal: "bg-teal-400",
} as const;

const WHITESPACE = /\s/;

const PODIUM_DELAYS: Record<1 | 2 | 3, number> = { 1: 0, 2: 80, 3: 160 };

function getScore(row: LeaderboardRow, key: ScoreKey): number {
  return row[key] ?? 0;
}

function firstName(name: string): string {
  return name.split(WHITESPACE)[0] ?? name;
}

export function LeaderboardList({
  rows,
  scoreKey,
  tone,
}: {
  rows: LeaderboardRow[];
  scoreKey: ScoreKey;
  tone: Tone;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-zinc-600">No activity yet</p>
    );
  }

  const podiumRows = rows.slice(0, 3);
  const listRows = rows.slice(3);
  // rows.length > 0 is guaranteed by the early return above
  const maxScore = getScore(rows[0] as LeaderboardRow, scoreKey);

  return (
    <div>
      {/* Podium - top 3 */}
      <div className="flex items-end justify-center gap-2 py-4 sm:gap-3">
        {(
          [
            { row: podiumRows[1], rank: 2 as const },
            { row: podiumRows[0], rank: 1 as const },
            { row: podiumRows[2], rank: 3 as const },
          ] as const
        ).map(({ row, rank }) => {
          if (!row) {
            return <div className="max-w-[160px] flex-1" key={rank} />;
          }

          const medal = medalConfig[rank];
          const isChampion = rank === 1;
          const score = getScore(row, scoreKey);

          return (
            <Tooltip key={row.actorId}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex max-w-[160px] flex-1 animate-fade-up flex-col items-center rounded-xl",
                    isChampion
                      ? "border border-amber-500/20 bg-zinc-900/80 px-3 pt-4 pb-5 shadow-amber-900/20 shadow-lg"
                      : "border border-zinc-800/60 bg-zinc-900/40 px-2.5 pt-3 pb-3.5"
                  )}
                  style={{
                    animationDelay: `${PODIUM_DELAYS[rank]}ms`,
                  }}
                >
                  <span
                    className={cn(
                      "mb-2.5 font-mono text-[10px] uppercase tracking-widest",
                      medal.accent
                    )}
                  >
                    {rank === 1 ? "\u2605" : `#${rank}`}
                  </span>
                  <Avatar
                    fallback={row.displayName}
                    imageUrl={row.imageUrl}
                    ring={medal.ring}
                    size={isChampion ? "lg" : "md"}
                  />
                  <p
                    className={cn(
                      "mt-2 max-w-full truncate",
                      isChampion
                        ? "font-semibold text-sm text-zinc-100"
                        : "font-medium text-xs text-zinc-300"
                    )}
                  >
                    {firstName(row.displayName)}
                  </p>
                  <p
                    className={cn(
                      "font-bold font-mono tabular-nums",
                      isChampion ? "text-2xl" : "text-lg",
                      medal.accent
                    )}
                  >
                    {score}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {row.displayName} &middot; {score} stamps
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Ranked list - positions 4+ */}
      {listRows.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {listRows.map((row, i) => {
            const score = getScore(row, scoreKey);
            const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;

            return (
              <div
                className="flex animate-fade-up items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-zinc-900/50"
                key={row.actorId}
                style={{ animationDelay: `${240 + i * 25}ms` }}
              >
                <span className="w-5 text-right font-mono text-xs text-zinc-600 tabular-nums">
                  {i + 4}
                </span>
                <Avatar fallback={row.displayName} imageUrl={row.imageUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-300">
                    {row.displayName}
                  </p>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-800/60">
                    <div
                      className={cn(
                        "h-full animate-bar-fill rounded-full",
                        toneBarColor[tone]
                      )}
                      style={{
                        width: `${pct}%`,
                        animationDelay: `${340 + i * 25}ms`,
                      }}
                    />
                  </div>
                </div>
                <span className="font-mono text-sm text-zinc-500 tabular-nums">
                  {score}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
