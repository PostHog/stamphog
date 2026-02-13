import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { LeaderboardList } from "~/features/stamps/components/leaderboard-list";
import { RecentEventsList } from "~/features/stamps/components/recent-events-list";
import {
  leaderboardQuery,
  recentStampEventsQuery,
  useLeaderboard,
} from "~/features/stamps/queries";
import { toLeaderboardRows } from "~/features/stamps/types";

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
  const { data: leaderboard } = useLeaderboard(windowDays);

  const giverRows = toLeaderboardRows(leaderboard.givers);
  const requesterRows = toLeaderboardRows(leaderboard.requesters);

  return (
    <div className="relative mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <header className="animate-fade-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h1 className="font-bold text-foreground text-lg tracking-tight">
              StampHog
            </h1>
            <Badge
              className="gap-1.5 border-chart-2/20 bg-chart-2/10 text-chart-2"
              variant="outline"
            >
              <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-chart-2" />
              Live
            </Badge>
          </div>
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
        <Stat label="stamps" value={leaderboard.totals.stamps} />
        <Stat label="reviews" value={leaderboard.totals.events} />
        <Stat label="PRs" value={leaderboard.totals.requests} />
      </div>

      {/* Leaderboard Tabs */}
      <Tabs
        className="mt-8 animate-fade-up"
        defaultValue="givers"
        style={{ animationDelay: "120ms" }}
      >
        <TabsList className="w-full">
          <TabsTrigger className="flex-1" value="givers">
            Stamp Givers
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="requesters">
            Stamp Requesters
          </TabsTrigger>
        </TabsList>
        <TabsContent value="givers">
          <LeaderboardList
            rows={giverRows}
            scoreKey="stampsGiven"
            tone="amber"
          />
        </TabsContent>
        <TabsContent value="requesters">
          <LeaderboardList
            rows={requesterRows}
            scoreKey="stampsRequested"
            tone="teal"
          />
        </TabsContent>
      </Tabs>

      <Separator className="my-10 bg-border" />

      {/* Recent Activity */}
      <section>
        <h2 className="mb-3 font-semibold text-muted-foreground/70 text-xs uppercase tracking-wider">
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
      <span className="font-bold font-mono text-2xl text-foreground tabular-nums">
        {value}
      </span>
      <span className="text-muted-foreground text-sm">{label}</span>
    </div>
  );
}
