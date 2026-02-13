import { AnimatePresence, LayoutGroup, motion } from "motion/react";
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
  1: { ring: "gold" as const, accent: "text-chart-1" },
  2: { ring: "silver" as const, accent: "text-muted-foreground" },
  3: { ring: "bronze" as const, accent: "text-chart-4" },
} as const;

const toneBarColor = {
  amber: "bg-chart-1",
  teal: "bg-chart-3",
} as const;

const WHITESPACE = /\s/;

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
      <p className="py-16 text-center text-muted-foreground text-sm">
        No activity yet
      </p>
    );
  }

  const podiumRows = rows.slice(0, 3);
  const listRows = rows.slice(3);
  // rows.length > 0 is guaranteed by the early return above
  const maxScore = getScore(rows[0] as LeaderboardRow, scoreKey);

  return (
    <LayoutGroup id={`leaderboard-${scoreKey}`}>
      <div>
        {/* Podium - top 3 */}
        <div className="flex items-end justify-center gap-2 py-4 sm:gap-3">
          <AnimatePresence mode="popLayout">
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
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-[160px] flex-1"
                  exit={{ opacity: 0, scale: 0.9 }}
                  initial={{ opacity: 0, y: 20 }}
                  key={row.actorId}
                  layout
                  transition={{
                    layout: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "flex flex-col items-center rounded-xl",
                          isChampion
                            ? "border border-primary/20 bg-card/80 px-3 pt-4 pb-5 shadow-lg shadow-primary/20"
                            : "border border-border bg-card/40 px-2.5 pt-3 pb-3.5"
                        )}
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
                              ? "font-semibold text-foreground text-sm"
                              : "font-medium text-secondary-foreground text-xs"
                          )}
                        >
                          {firstName(row.displayName)}
                        </p>
                        <motion.p
                          animate={{ scale: 1, color: undefined }}
                          className={cn(
                            "font-bold font-mono tabular-nums",
                            isChampion ? "text-2xl" : "text-lg",
                            medal.accent
                          )}
                          initial={{ scale: 1.3, color: "#fff" }}
                          key={score}
                          transition={{ duration: 0.3 }}
                        >
                          {score}
                        </motion.p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {row.displayName} &middot; {score} stamps
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Ranked list - positions 4+ */}
        {listRows.length > 0 && (
          <div className="mt-2">
            <AnimatePresence initial={false}>
              {listRows.map((row, i) => {
                const score = getScore(row, scoreKey);
                const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;

                return (
                  <motion.div
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent/50"
                    exit={{ opacity: 0, x: 20 }}
                    initial={{ opacity: 0, x: -20 }}
                    key={row.actorId}
                    layout
                    transition={{
                      layout: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 },
                    }}
                  >
                    <span className="w-5 text-right font-mono text-muted-foreground/70 text-xs tabular-nums">
                      {i + 4}
                    </span>
                    <Avatar
                      fallback={row.displayName}
                      imageUrl={row.imageUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-secondary-foreground text-sm">
                        {row.displayName}
                      </p>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          animate={{ width: `${pct}%` }}
                          className={cn(
                            "h-full rounded-full",
                            toneBarColor[tone]
                          )}
                          initial={{ width: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 25,
                          }}
                        />
                      </div>
                    </div>
                    <span className="font-mono text-muted-foreground text-sm tabular-nums">
                      {score}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </LayoutGroup>
  );
}
