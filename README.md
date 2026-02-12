# StampHog

Realtime leaderboard of who gives and receives the most PR approval "stamps" in Slack.

Built with [TanStack Start](https://tanstack.com/start) + [Convex](https://convex.dev).

## What It Does

- Tracks stamp events (`giver -> requester`)
- Shows live 30-day leaderboards for:
  - top stamp givers
  - top stamp requesters
- Exposes a Slack ingestion endpoint at `/slack/stamps`
- Uses Slack `reaction_added` events only

## Quick Start

```bash
pnpm install
npx convex dev --once
pnpm dev
```

## Slack Setup

1. Set Event Subscriptions request URL to:
   - `https://<your-convex-deployment>.convex.site/slack/stamps`
2. Subscribe to bot event:
   - `reaction_added`
   - `reaction_removed`
3. Add OAuth scopes for reading message context:
   - `reactions:read`
   - `channels:history` (plus `groups:history` if private channels)
   - `users:read` (to show Slack names and avatars)
4. In Convex, set:
   - `SLACK_SIGNING_SECRET` (for verifying Slack signatures)
   - `SLACK_BOT_TOKEN` (for fetching the reacted message author)
5. Tracked stamp emojis are hardcoded in:
   - `convex/slack.ts` (`TRACKED_STAMP_EMOJIS`)

### How Reaction Events Become Stamps

- A stamp is recorded only when someone adds a tracked reaction emoji.
- The reacted message must include at least one qualifying URL:
  - `github.com/...` or `*.github.com/...`
  - `graphite.dev/...` or `*.graphite.dev/...`
- `reviewer` / stamp giver = the user who added the reaction (`event.user`).
- `requester` = the author of the reacted message (looked up via Slack API).
- Non-tracked emojis, non-`reaction_added` events, or messages without a qualifying URL are ignored.

## Backfill Existing History

Run a one-time backfill to import existing qualifying reactions from a channel:

```bash
npx convex run stamps.backfillChannel '{"channelId":"C0123456789"}'
```

Optional args:

```bash
npx convex run stamps.backfillChannel '{"channelId":"C0123456789","oldestTs":"1704067200","maxMessages":10000}'
```

- `oldestTs` is a Slack timestamp string in seconds (`"1704067200"` = 2024-01-01 00:00:00 UTC).
- `maxMessages` bounds scan cost (default `5000`, max `50000`).
- Backfill is idempotent via dedupe keys, so it is safe to rerun.

## Scripts

- `pnpm dev`: run app + Convex
- `pnpm dev:web`: run web app only
- `pnpm dev:convex`: run Convex only
- `pnpm check-types`: typecheck
- `pnpm check`: lint
