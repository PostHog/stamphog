import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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

function Home() {
  const [windowDays, setWindowDays] = useState(30);
  const [tab, setTab] = useState<"givers" | "requesters">("givers");
  const { data: leaderboard } = useLeaderboard(windowDays);

  const giverRows = toLeaderboardRows(leaderboard.givers);
  const requesterRows = toLeaderboardRows(leaderboard.requesters);
  const rows = tab === "givers" ? giverRows : requesterRows;
  const scoreKey =
    tab === "givers" ? ("stampsGiven" as const) : ("stampsRequested" as const);
  const tone = tab === "givers" ? ("amber" as const) : ("teal" as const);

  return (
    <div className="relative mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <header className="animate-fade-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h1 className="font-bold text-lg text-zinc-100 tracking-tight">
              StampHog
            </h1>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-[10px] text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-emerald-400" />
              Live
            </span>
          </div>
          <select
            className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-400 outline-none transition-colors hover:border-zinc-700 hover:text-zinc-300"
            onChange={(e) => setWindowDays(Number(e.target.value))}
            value={windowDays}
          >
            {WINDOWS.map((d) => (
              <option key={d} value={d}>
                {d}-day
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-sm text-zinc-500">PR approval leaderboard</p>
      </header>

      {/* Stats */}
      <div
        className="mt-6 flex animate-fade-up items-baseline gap-6 sm:gap-8"
        style={{ animationDelay: "60ms" }}
      >
        <Stat label="stamps" value={leaderboard.totals.stamps} />
        <Stat label="reviews" value={leaderboard.totals.events} />
        <Stat label="PRs" value={leaderboard.totals.requests} />
      </div>

      {/* Tab Switcher */}
      <div
        className="relative mt-8 flex animate-fade-up rounded-lg bg-zinc-900/70 p-1"
        style={{ animationDelay: "120ms" }}
      >
        <div
          className={cn(
            "absolute top-1 bottom-1 rounded-md bg-zinc-800 transition-all duration-300 ease-out",
            tab === "givers"
              ? "right-[calc(50%+2px)] left-1"
              : "right-1 left-[calc(50%+2px)]"
          )}
        />
        <button
          className={cn(
            "relative z-10 flex-1 rounded-md py-2 font-medium text-sm transition-colors",
            tab === "givers"
              ? "text-zinc-100"
              : "text-zinc-500 hover:text-zinc-400"
          )}
          onClick={() => setTab("givers")}
          type="button"
        >
          Stamp Givers
        </button>
        <button
          className={cn(
            "relative z-10 flex-1 rounded-md py-2 font-medium text-sm transition-colors",
            tab === "requesters"
              ? "text-zinc-100"
              : "text-zinc-500 hover:text-zinc-400"
          )}
          onClick={() => setTab("requesters")}
          type="button"
        >
          Stamp Requesters
        </button>
      </div>

      {/* Leaderboard */}
      <div className="mt-4">
        <LeaderboardList
          key={tab}
          rows={rows}
          scoreKey={scoreKey}
          tone={tone}
        />
      </div>

      {/* Recent Activity */}
      <section className="mt-10">
        <h2 className="mb-3 font-semibold text-xs text-zinc-600 uppercase tracking-wider">
          Recent Activity
        </h2>
        <RecentEventsList />
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-bold font-mono text-2xl text-zinc-100 tabular-nums">
        {value}
      </span>
      <span className="text-sm text-zinc-500">{label}</span>
    </div>
  );
}
