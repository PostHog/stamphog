import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ModeToggle } from "~/components/mode-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { LeaderboardList } from "~/features/stamps/components/leaderboard-list";
import { RecentEventsList } from "~/features/stamps/components/recent-events-list";
import {
  leaderboardQuery,
  recentStampEventsQuery,
  useLeaderboard,
} from "~/features/stamps/queries";
import { toLeaderboardRows } from "~/features/stamps/types";
import { cn } from "~/lib/utils";

const WINDOWS = [7, 14, 30, 60, 90] as const;

export const Route = createFileRoute("/")({
  loader: async (opts) => {
    await Promise.all([
      opts.context.queryClient.ensureQueryData(leaderboardQuery()),
      opts.context.queryClient.ensureQueryData(recentStampEventsQuery),
    ]);
  },
  component: Home,
});

type Tab = "givers" | "requesters";

function Home() {
  const [windowDays, setWindowDays] = useState(30);
  const [tab, setTab] = useState<Tab>("givers");
  const { data: leaderboard, isPlaceholderData } = useLeaderboard(windowDays);

  const giverRows = toLeaderboardRows(leaderboard?.givers ?? []);
  const requesterRows = toLeaderboardRows(leaderboard?.requesters ?? []);

  return (
    <div className="relative mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:max-w-6xl">
      {/* Header */}
      <header className="animate-fade-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              alt="StampHog mascot"
              className="size-8"
              src="/superman-hog.png"
            />
            <h1 className="font-bold text-foreground text-lg tracking-tight">
              StampHog
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Select
              onValueChange={(v) => setWindowDays(Number(v))}
              value={String(windowDays)}
            >
              <SelectTrigger
                className="h-7 w-auto border-border bg-card text-muted-foreground text-xs"
                size="sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WINDOWS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d}-day
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ModeToggle />
          </div>
        </div>
        <p className="mt-1 text-muted-foreground text-sm">
          PR approval leaderboard
        </p>
      </header>

      {/* Stats */}
      <div
        className="mt-6 flex animate-fade-up items-baseline gap-6 sm:gap-8"
        style={{ animationDelay: "60ms" }}
      >
        <Stat label="stamps" value={leaderboard?.totals.stamps ?? 0} />
        <Stat label="PRs" value={leaderboard?.totals.requests ?? 0} />
      </div>

      {/* Main content: side by side on large screens */}
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
        {/* Leaderboard Tabs */}
        <Tabs
          className={cn(
            "animate-fade-up transition-opacity duration-200",
            isPlaceholderData && "opacity-50"
          )}
          onValueChange={(v) => setTab(v as Tab)}
          style={{ animationDelay: "120ms" }}
          value={tab}
        >
          <TabsList className="w-full">
            <TabsTrigger className="flex-1" value="givers">
              Stamp Givers
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="requesters">
              Stamp Requesters
            </TabsTrigger>
          </TabsList>
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              initial={{ opacity: 0, y: 8 }}
              key={tab}
              transition={{ duration: 0.15 }}
            >
              {tab === "givers" ? (
                <LeaderboardList
                  rows={giverRows}
                  scoreKey="stampsGiven"
                  tone="amber"
                />
              ) : (
                <LeaderboardList
                  rows={requesterRows}
                  scoreKey="stampsRequested"
                  tone="teal"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </Tabs>

        {/* Recent Activity */}
        <section>
          <h2 className="mb-3 font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider">
            Recent Activity
          </h2>
          <RecentEventsList />
        </section>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-bold font-mono text-2xl text-foreground tabular-nums">
        {value}
      </span>
      <span className="text-muted-foreground text-sm">{label}</span>
    </div>
  );
}
