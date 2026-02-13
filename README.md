<p align="center">
  <img alt="stamphog" src="https://raw.githubusercontent.com/PostHog/stamphog/main/public/superman-hog.png" width="200">
</p>

<h1 align="center">StampHog</h1>

<p align="center">
  Realtime leaderboard of who gives and receives the most PR approval stamps in Slack.
</p>

> [!WARNING]
> This is a chaotic side project held together by vibes and Convex. If you take leaderboard rankings seriously, that's on you.

## 🦔 What is StampHog?

StampHog gamifies code review culture. It watches your Slack channels for PR links and stamp reactions, then ranks everyone on a live leaderboard. Think of it as a hall of fame for your most prolific reviewers (and most persistent PR posters).

**How it works:**

1. Someone posts a GitHub or Graphite PR link in Slack
2. A reviewer reacts with a stamp emoji (there are 19 tracked variants)
3. StampHog records the stamp and updates the leaderboard in realtime

Built with [TanStack Start](https://tanstack.com/start) + [Convex](https://convex.dev) + [PostHog](https://posthog.com).

## 🚀 Quick Start

```bash
pnpm install
npx convex dev --once
pnpm dev
```

## 💬 Slack Setup

1. Set Event Subscriptions request URL to:
   - `https://<your-convex-deployment>.convex.site/slack/stamps`
2. Subscribe to bot events:
   - `reaction_added`
   - `reaction_removed`
   - `message.channels` (and `message.groups` for private channels)
3. Add OAuth scopes:
   - `reactions:read`
   - `channels:history` (plus `groups:history` for private channels)
   - `users:read` (for names and avatars)
   - `emoji:read` (for custom emoji URLs)
4. In Convex, set environment variables:
   - `SLACK_SIGNING_SECRET` (for verifying Slack signatures)
   - `SLACK_BOT_TOKEN` (for fetching message authors)
   - `CHANNEL_IDS` (comma-separated channel IDs for backfill)

### What counts as a stamp?

StampHog tracks 19 emoji variants including `stamp`, `lgtm`, `approved_stamp`, `check`, and more. The reacted message must contain a qualifying URL (`github.com` or `graphite.dev`).

### How reactions become stamps

- **Reviewer** (stamp giver) = the user who added the reaction
- **Requester** = the author of the reacted message (looked up via Slack API)
- PR request messages are tracked as soon as they're posted, so requesters appear even with 0 stamps
- Non-tracked emojis and messages without qualifying URLs are ignored

## 📦 Backfill Existing History

Import existing qualifying reactions from Slack channels:

```bash
# Single channel
npx convex run stamps.backfillChannel '{"channelId":"C0123456789"}'

# Multiple channels
npx convex run stamps.backfillChannels '{"channelIds":["C0123456789","C0987654321"]}'

# With options
npx convex run stamps.backfillChannel '{"channelId":"C0123456789","oldestTs":"1704067200","maxMessages":10000}'
```

- `oldestTs` is a Slack timestamp in seconds (`"1704067200"` = 2024-01-01 UTC)
- `maxMessages` bounds scan cost (default `5000`, max `50000`)
- Backfill is hard-limited to the most recent 90 days
- Idempotent via dedupe keys, safe to rerun

## 🧹 Data Retention

Delete data older than 90 days and clean up orphaned actors:

```bash
npx convex run stamps.pruneDataOlderThanRetentionWindow '{}'
```

## 🛠️ Development

```bash
pnpm dev              # Run web app + Convex together
pnpm dev:web          # Web app only (Vite)
pnpm dev:convex       # Convex only
pnpm build            # Production build
pnpm preview          # Preview production build
pnpm check-types      # TypeScript check
pnpm check            # Lint (ultracite/biome)
pnpm fix              # Auto-fix lint issues
```

## 🤝 Contributing

PRs welcome. See [PostHog's contributing guide](https://posthog.com/docs/contribute) for general guidelines.

## 📄 License

MIT
