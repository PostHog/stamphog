import { createFileRoute } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePostHog } from "posthog-js/react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { LeaderboardList } from "~/features/stamps/components/leaderboard-list";
import { RecentEventsList } from "~/features/stamps/components/recent-events-list";
import {
  leaderboardQuery,
  recentStampEventsQuery,
  useLeaderboard,
} from "~/features/stamps/queries";
import { toLeaderboardRows } from "~/features/stamps/types";
import { cn } from "~/lib/utils";
import { getWindowDays, setWindowDays } from "~/lib/window-days";
import { STAMP_EMOJIS } from "../../convex/slack";

const WINDOWS = [7, 14, 30, 60, 90] as const;

export const Route = createFileRoute("/")({
  loader: async (opts) => {
    const windowDays = await getWindowDays();
    await Promise.all([
      opts.context.queryClient.ensureQueryData(leaderboardQuery(windowDays)),
      opts.context.queryClient.ensureQueryData(recentStampEventsQuery),
    ]);
    return { windowDays };
  },
  component: Home,
});

type Tab = "givers" | "requesters";

function Home() {
  const posthog = usePostHog();
  const { windowDays: initialWindowDays } = Route.useLoaderData();
  const [windowDays, setWindowDaysLocal] = useState(initialWindowDays);
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
              onValueChange={(v) => {
                const days = Number(v);
                setWindowDaysLocal(days);
                setWindowDays({ data: days });
                posthog.capture("time_window_changed", {
                  window_days: days,
                  previous_window_days: windowDays,
                });
              }}
              value={String(windowDays)}
            >
              <SelectTrigger
                className="h-7 w-auto border-border bg-card text-muted-foreground text-xs"
                size="sm"
              >
                <Calendar className="size-3" />
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
        <div className="mt-4 space-y-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-muted-foreground text-sm leading-relaxed">
          <p>
            <strong className="text-foreground">How it works:</strong>
          </p>
          <ol className="list-inside list-decimal space-y-1">
            <li>
              Post a message in Slack with a{" "}
              <span className="font-medium text-foreground">
                GitHub or Graphite PR link
              </span>{" "}
              to request a stamp
            </li>
            <li>
              React to that message with{" "}
              <span className="inline-flex flex-wrap items-center gap-1 align-middle">
                {Object.entries(STAMP_EMOJIS).map(([name, url]) => (
                  <Tooltip key={name}>
                    <TooltipTrigger asChild>
                      <img
                        alt={`:${name}:`}
                        className="inline-block h-5 w-5"
                        src={url}
                      />
                    </TooltipTrigger>
                    <TooltipContent>:{name}:</TooltipContent>
                  </Tooltip>
                ))}
              </span>{" "}
              to give a stamp
            </li>
          </ol>
        </div>
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
          onValueChange={(v) => {
            const newTab = v as Tab;
            posthog.capture("leaderboard_tab_switched", {
              tab: newTab,
              previous_tab: tab,
            });
            setTab(newTab);
          }}
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
