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

const podiumConfig = {
  1: {
    ring: "gold" as const,
    accent: "text-chart-1",
    avatarSize: "xl" as const,
    pedestal: "h-20 bg-gradient-to-t from-chart-1/20 to-chart-1/5",
    label: "\uD83D\uDC51",
    labelClass: "text-2xl",
    nameClass: "font-semibold text-foreground text-base",
    scoreClass: "text-3xl",
  },
  2: {
    ring: "silver" as const,
    accent: "text-muted-foreground",
    avatarSize: "lg" as const,
    pedestal: "h-14 bg-muted/60",
    label: "2",
    labelClass: "font-mono text-lg font-bold",
    nameClass: "font-medium text-secondary-foreground text-sm",
    scoreClass: "text-xl",
  },
  3: {
    ring: "bronze" as const,
    accent: "text-chart-4",
    avatarSize: "md" as const,
    pedestal: "h-10 bg-muted/40",
    label: "3",
    labelClass: "font-mono text-base font-bold",
    nameClass: "font-medium text-secondary-foreground text-xs",
    scoreClass: "text-lg",
  },
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
        <div className="flex items-end justify-center gap-3 pt-6 pb-2 sm:gap-4">
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

              const cfg = podiumConfig[rank];
              const isChampion = rank === 1;
              const score = getScore(row, scoreKey);

              return (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="flex max-w-[180px] flex-1 flex-col items-center"
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
                      <div className="flex w-full flex-col items-center">
                        {/* Avatar + info */}
                        <div className="relative flex flex-col items-center">
                          {isChampion && (
                            <div className="absolute -inset-4 rounded-full bg-chart-1/10 blur-2xl" />
                          )}
                          <span
                            className={cn("mb-1.5", cfg.labelClass, cfg.accent)}
                          >
                            {cfg.label}
                          </span>
                          <Avatar
                            fallback={row.displayName}
                            imageUrl={row.imageUrl}
                            ring={cfg.ring}
                            size={cfg.avatarSize}
                          />
                          <p
                            className={cn(
                              "mt-2 max-w-full truncate",
                              cfg.nameClass
                            )}
                          >
                            {firstName(row.displayName)}
                          </p>
                        </div>

                        {/* Pedestal */}
                        <div
                          className={cn(
                            "mt-3 flex w-full items-center justify-center rounded-lg",
                            cfg.pedestal
                          )}
                        >
                          <motion.span
                            animate={{ scale: 1, color: undefined }}
                            className={cn(
                              "font-bold font-mono tabular-nums",
                              cfg.scoreClass,
                              cfg.accent
                            )}
                            initial={{ scale: 1.3 }}
                            key={score}
                            transition={{ duration: 0.3 }}
                          >
                            {score}
                          </motion.span>
                        </div>
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
