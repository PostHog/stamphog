import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { LeaderboardList } from "~/features/stamps/components/leaderboard-list";
import { RecentEventsList } from "~/features/stamps/components/recent-events-list";
import { StampMiniBars } from "~/features/stamps/components/stamp-mini-bars";
import {
  leaderboardQuery,
  recentStampEventsQuery,
  useLeaderboard,
} from "~/features/stamps/queries";
import { toLeaderboardRows } from "~/features/stamps/types";

export const Route = createFileRoute("/")({
  loader: async (opts) => {
    await Promise.all([
      opts.context.queryClient.ensureQueryData(leaderboardQuery),
      opts.context.queryClient.ensureQueryData(recentStampEventsQuery),
    ]);
  },
  component: Home,
});

function Home() {
  const { data: leaderboard } = useLeaderboard();

  const giverRows = toLeaderboardRows(leaderboard.givers);
  const requesterRows = toLeaderboardRows(leaderboard.requesters);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-8 py-12 md:py-16">
      <main className="space-y-10">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Badge>StampHog</Badge>
            <Badge className="text-zinc-300">
              {leaderboard.totals.requests} requests
            </Badge>
          </div>
          <h1 className="mb-4 font-bold text-4xl tracking-tight">
            StampHog: Realtime PR Approval Leaderboard
          </h1>
          <p className="text-sm text-zinc-400">
            Reactions on qualifying GitHub/Graphite request messages update this
            leaderboard in realtime.
          </p>
        </section>

        <section>
          <Card className="border-zinc-800">
            <CardHeader className="border-zinc-800 border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">30-Day Leaderboard</CardTitle>
                {leaderboard.totals.events > 0 && (
                  <p className="text-xs text-zinc-400">
                    {leaderboard.totals.stamps} stamps ·{" "}
                    {leaderboard.totals.requests} requests
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-semibold text-sm text-zinc-100">
                    Top stamp givers
                  </h3>
                  <LeaderboardList
                    emptyText="No stamp givers yet."
                    rows={giverRows}
                    scoreKey="stampsGiven"
                  />
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-sm text-zinc-100">
                    Top stamp requesters
                  </h3>
                  <LeaderboardList
                    emptyText="No stamp requesters yet."
                    rows={requesterRows}
                    scoreKey="stampsRequested"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stamp Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-5 md:grid-cols-2">
                <StampMiniBars
                  rows={giverRows}
                  scoreKey="stampsGiven"
                  title="Top Givers"
                  tone="amber"
                />
                <StampMiniBars
                  rows={requesterRows}
                  scoreKey="stampsRequested"
                  title="Top Requesters"
                  tone="teal"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="border-zinc-800">
            <CardHeader className="border-zinc-800 border-b pb-4">
              <CardTitle className="text-xl">Recent Stamp Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentEventsList />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
