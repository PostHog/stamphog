import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ras-sh/ui";
import { createFileRoute } from "@tanstack/react-router";
import packageJson from "../../package.json" with { type: "json" };
import {
  leaderboardQuery,
  recentStampEventsQuery,
  useLeaderboard,
  useRecentStampEvents,
} from "../hooks/use-stamps";

export const Route = createFileRoute("/")({
  loader: async (opts) => {
    await Promise.all([
      opts.context.queryClient.ensureQueryData(leaderboardQuery),
      opts.context.queryClient.ensureQueryData(recentStampEventsQuery),
    ]);
  },
  component: Home,
});

function formatDate(ts: number) {
  return new Date(ts).toLocaleString();
}

type LeaderboardRow = {
  slackUserId: string;
  displayName: string;
  imageUrl?: string;
} & Record<string, string | number | undefined>;

function Avatar({
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

function PersonLabel({
  displayName,
  slackUserId,
  imageUrl,
}: {
  displayName: string;
  slackUserId: string;
  imageUrl?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar fallback={displayName} imageUrl={imageUrl} />
      <div className="min-w-0">
        <p className="truncate font-medium text-sm text-zinc-100">{displayName}</p>
        <p className="truncate text-xs text-zinc-500">{slackUserId}</p>
      </div>
    </div>
  );
}

function LeaderboardList({
  rows,
  scoreKey,
  secondaryKey,
  emptyText,
}: {
  rows: LeaderboardRow[];
  scoreKey: string;
  secondaryKey: string;
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
          key={String(row.slackUserId)}
        >
          <PersonLabel
            displayName={`${index + 1}. ${String(row.displayName)}`}
            imageUrl={typeof row.imageUrl === "string" ? row.imageUrl : undefined}
            slackUserId={String(row.slackUserId)}
          />
          <div className="text-right">
            <p className="font-semibold text-sm text-zinc-100">
              {Number(row[scoreKey])} stamps
            </p>
            <p className="text-xs text-zinc-400">
              {Number(row[secondaryKey])} approvals
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentEvents() {
  const { data: events } = useRecentStampEvents();
  return (
    <div className="space-y-2">
      {events.length === 0 && (
        <p className="text-sm text-zinc-500">No stamp activity yet.</p>
      )}
      {events.map((event) => (
        <div
          className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2"
          key={event._id}
        >
          <div className="flex items-center gap-2">
            <Avatar
              fallback={event.giverDisplayName}
              imageUrl={event.giverImageUrl}
            />
            <p className="text-sm text-zinc-200">
              <span className="font-medium">{event.giverDisplayName}</span>{" "}
              stamped{" "}
              <span className="font-medium">{event.requesterDisplayName}</span>{" "}
              (+{event.stampCount})
            </p>
          </div>
          <p className="text-xs text-zinc-500">
            {formatDate(event.occurredAt)}
            {event.prUrl ? `  |  ${event.prUrl}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function SlackEndpoint() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "";
  const endpoint = convexUrl.replace(".convex.cloud", ".convex.site");
  const webhookUrl = endpoint
    ? `${endpoint}/slack/stamps`
    : "SET_VITE_CONVEX_URL";

  return (
    <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="font-medium text-sm text-zinc-100">
        Slack ingestion endpoint
      </p>
      <p className="break-all font-mono text-xs text-zinc-400">{webhookUrl}</p>
      <p className="text-xs text-zinc-500">
        Reaction mode: add a tracked emoji (for example :white_check_mark:) to a
        PR request message.
      </p>
      <p className="text-xs text-zinc-500">
        Only messages containing a GitHub or Graphite URL are counted.
      </p>
    </div>
  );
}

function Home() {
  const { data: leaderboard } = useLeaderboard();

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-8 py-12 sm:space-y-16 md:py-20">
      <main className="space-y-16">
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="secondary">StampHog</Badge>
            <Badge variant="outline">v{packageJson.version}</Badge>
          </div>
          <h1 className="mb-8 font-bold text-4xl tracking-tight">
            StampHog: Realtime PR Approval Leaderboard
          </h1>

          <div className="space-y-4">
            <p className="text-lg text-zinc-300 leading-relaxed">
              Track who gives the most PR approval stamps and whose PRs get the
              most stamp requests in your PostHog Slack channel.
            </p>
            <p className="text-sm text-zinc-400">
              Convex powers live updates, so this board refreshes instantly
              whenever a new stamp event is logged.
            </p>
          </div>
        </section>

        <section>
          <Card className="border-zinc-800">
            <CardHeader className="border-zinc-800 border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">30-Day Leaderboard</CardTitle>
                  <CardDescription className="mt-1.5">
                    Realtime ranking of stamp givers and requesters
                  </CardDescription>
                </div>
                {leaderboard.totals.events > 0 && (
                  <Badge className="text-xs" variant="secondary">
                    {leaderboard.totals.stamps} total stamps
                  </Badge>
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
                    rows={leaderboard.givers}
                    scoreKey="stampsGiven"
                    secondaryKey="approvalsGiven"
                  />
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-sm text-zinc-100">
                    Top stamp requesters
                  </h3>
                  <LeaderboardList
                    emptyText="No stamp requesters yet."
                    rows={leaderboard.requesters}
                    scoreKey="stampsRequested"
                    secondaryKey="approvalsReceived"
                  />
                </div>
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
              <RecentEvents />
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="mb-6 border-zinc-800/50 border-b pb-2 font-bold text-2xl text-zinc-100">
            Setup Notes
          </h2>
          <div className="space-y-2 text-sm text-zinc-400">
            <SlackEndpoint />
            <p>
              1. Configure Slack Event Subscriptions to point at the endpoint
              above and subscribe to <code>reaction_added</code> and{" "}
              <code>reaction_removed</code>.
            </p>
            <p>
              2. Set <code>SLACK_SIGNING_SECRET</code>,{" "}
              <code>SLACK_BOT_TOKEN</code> in Convex env.
            </p>
            <p>
              3. Stamp events only count when the reacted message includes a
              GitHub or Graphite URL.
            </p>
            <p>
              4. Backfill existing history with{" "}
              <code>
                npx convex run stamps.backfillChannel {'{"channelId":"C123..."}'}
              </code>
              .
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
