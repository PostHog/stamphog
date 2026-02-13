import { api } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import {
  buildReactionDedupeKey,
  buildRequestDedupeKey,
  fetchSlackHistoryPage,
  fetchSlackUserSummary,
  findQualifyingReviewUrlWithThreadFallback,
  getStampEmojiSet,
  normalizeEmoji,
  type SlackHistoryMessage,
  type SlackUserSummary,
} from "../slack";

const DEFAULT_MAX_MESSAGES = 5000;
const MAX_BACKFILL_MESSAGES = 50_000;
const BACKFILL_WINDOW_DAYS = 90;
const PAGE_SIZE = 200;

interface BackfillArgs {
  channelId: string;
  oldestTs?: string;
  maxMessages?: number;
}

type CountMap = Map<string, number>;

interface BackfillState {
  scannedMessages: number;
  qualifyingMessages: number;
  createdEvents: number;
  duplicateEvents: number;
  createdRequests: number;
  duplicateRequests: number;
  skippedSelfReactions: number;
  skippedMissingUrl: number;
  skippedMissingAuthor: number;
  skippedNoReactions: number;
  skippedNoTrackedReactions: number;
  messagesWithAnyReaction: number;
  messagesWithTrackedReaction: number;
  allReactionNames: CountMap;
  trackedReactionNames: CountMap;
  untrackedReactionNames: CountMap;
  qualifyingUrlHosts: CountMap;
}

function createBackfillState(): BackfillState {
  return {
    scannedMessages: 0,
    qualifyingMessages: 0,
    createdEvents: 0,
    duplicateEvents: 0,
    createdRequests: 0,
    duplicateRequests: 0,
    skippedSelfReactions: 0,
    skippedMissingUrl: 0,
    skippedMissingAuthor: 0,
    skippedNoReactions: 0,
    skippedNoTrackedReactions: 0,
    messagesWithAnyReaction: 0,
    messagesWithTrackedReaction: 0,
    allReactionNames: new Map<string, number>(),
    trackedReactionNames: new Map<string, number>(),
    untrackedReactionNames: new Map<string, number>(),
    qualifyingUrlHosts: new Map<string, number>(),
  };
}

function incrementCount(
  counterMap: CountMap,
  key: string | undefined,
  amount = 1
) {
  if (!key) {
    return;
  }
  counterMap.set(key, (counterMap.get(key) ?? 0) + amount);
}

function topCounts(counterMap: CountMap, limit = 20) {
  return Array.from(counterMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function toOccurredAtMs(timestamp: string | undefined) {
  if (!timestamp) {
    return undefined;
  }
  const parsed = Number(timestamp);
  return Number.isFinite(parsed) ? Math.floor(parsed * 1000) : undefined;
}

function boundedMaxMessages(maxMessages: number | undefined) {
  return Math.max(
    1,
    Math.min(
      MAX_BACKFILL_MESSAGES,
      Math.floor(maxMessages ?? DEFAULT_MAX_MESSAGES)
    )
  );
}

function backfillCutoffTsSeconds() {
  const cutoffMs = Date.now() - BACKFILL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return String(Math.floor(cutoffMs / 1000));
}

function effectiveOldestTs(userOldestTs: string | undefined) {
  const cutoffTs = backfillCutoffTsSeconds();
  if (!userOldestTs) {
    return cutoffTs;
  }
  const requested = Number(userOldestTs);
  const cutoff = Number(cutoffTs);
  if (!Number.isFinite(requested) || requested < cutoff) {
    return cutoffTs;
  }
  return userOldestTs;
}

function buildSummary(args: {
  state: BackfillState;
  channelId: string;
  trackedStampEmojis: Set<string>;
}) {
  return {
    channelId: args.channelId,
    scannedMessages: args.state.scannedMessages,
    qualifyingMessages: args.state.qualifyingMessages,
    createdEvents: args.state.createdEvents,
    duplicateEvents: args.state.duplicateEvents,
    createdRequests: args.state.createdRequests,
    duplicateRequests: args.state.duplicateRequests,
    skippedSelfReactions: args.state.skippedSelfReactions,
    skippedMissingUrl: args.state.skippedMissingUrl,
    skippedMissingAuthor: args.state.skippedMissingAuthor,
    skippedNoReactions: args.state.skippedNoReactions,
    skippedNoTrackedReactions: args.state.skippedNoTrackedReactions,
    messagesWithAnyReaction: args.state.messagesWithAnyReaction,
    messagesWithTrackedReaction: args.state.messagesWithTrackedReaction,
    topAllReactionNames: topCounts(args.state.allReactionNames),
    topTrackedReactionNames: topCounts(args.state.trackedReactionNames),
    topUntrackedReactionNames: topCounts(args.state.untrackedReactionNames),
    qualifyingUrlHosts: topCounts(args.state.qualifyingUrlHosts),
    trackedEmojiSet: Array.from(args.trackedStampEmojis.values()).sort(),
  };
}

interface RuntimeContext {
  ctx: ActionCtx;
  channelId: string;
  trackedStampEmojis: Set<string>;
  state: BackfillState;
  getUserSummary: (slackUserId: string) => Promise<SlackUserSummary>;
  findQualifyingUrl: (args: {
    messageTs: string;
    messageText?: string;
    includeThreadFallback: boolean;
  }) => Promise<string | undefined>;
}

async function ingestRequestForMessage(
  runtime: RuntimeContext,
  message: SlackHistoryMessage,
  requesterId: string,
  qualifyingUrl: string,
  messageRef: string
) {
  const requester = await runtime.getUserSummary(requesterId);
  const requestResult = await runtime.ctx.runMutation(
    api.stamps.ingestRequestMessage,
    {
      requesterId,
      requesterDisplayName: requester.displayName,
      requesterImageUrl: requester.imageUrl,
      channelId: runtime.channelId,
      messageRef,
      occurredAt: toOccurredAtMs(message.ts),
      prUrl: qualifyingUrl,
      dedupeKey: buildRequestDedupeKey({
        channelId: runtime.channelId,
        messageTs: messageRef,
      }),
    }
  );

  if (requestResult.duplicateSkipped) {
    runtime.state.duplicateRequests += 1;
  } else {
    runtime.state.createdRequests += 1;
  }
}

async function ingestTrackedReactionUsers(args: {
  runtime: RuntimeContext;
  requesterId: string;
  messageRef: string;
  message: SlackHistoryMessage;
  occurredAt: number | undefined;
  reactionName: string;
  qualifyingUrl: string;
  giverIds: string[];
}) {
  for (const giverId of args.giverIds) {
    if (giverId === args.requesterId) {
      args.runtime.state.skippedSelfReactions += 1;
      continue;
    }

    const [giver, requesterSummary] = await Promise.all([
      args.runtime.getUserSummary(giverId),
      args.runtime.getUserSummary(args.requesterId),
    ]);

    const dedupeKey = buildReactionDedupeKey({
      channelId: args.runtime.channelId,
      messageTs: args.messageRef,
      reaction: args.reactionName,
      giverSlackId: giverId,
    });

    const result = await args.runtime.ctx.runMutation(
      api.stamps.ingestReactionStamp,
      {
        giverId,
        requesterId: args.requesterId,
        giverDisplayName: giver.displayName,
        requesterDisplayName: requesterSummary.displayName,
        giverImageUrl: giver.imageUrl,
        requesterImageUrl: requesterSummary.imageUrl,
        reaction: args.reactionName,
        source: `slack:reaction:${args.reactionName}`,
        occurredAt: args.occurredAt,
        channelId: args.runtime.channelId,
        prUrl: args.qualifyingUrl,
        dedupeKey,
      }
    );

    if (result.duplicateSkipped) {
      args.runtime.state.duplicateEvents += 1;
    } else {
      args.runtime.state.createdEvents += 1;
    }
  }
}

async function processMessageReactions(args: {
  runtime: RuntimeContext;
  requesterId: string;
  message: SlackHistoryMessage;
  messageRef: string;
  qualifyingUrl: string;
}) {
  const reactions = args.message.reactions ?? [];
  if (reactions.length === 0) {
    args.runtime.state.skippedNoReactions += 1;
    return false;
  }

  args.runtime.state.messagesWithAnyReaction += 1;
  const occurredAt = toOccurredAtMs(args.message.ts);
  let matchedTrackedReaction = false;

  for (const reaction of reactions) {
    const reactionName = normalizeEmoji(reaction.name ?? "");
    incrementCount(args.runtime.state.allReactionNames, reactionName);

    if (!args.runtime.trackedStampEmojis.has(reactionName)) {
      incrementCount(args.runtime.state.untrackedReactionNames, reactionName);
      continue;
    }

    matchedTrackedReaction = true;
    incrementCount(args.runtime.state.trackedReactionNames, reactionName);

    await ingestTrackedReactionUsers({
      runtime: args.runtime,
      requesterId: args.requesterId,
      messageRef: args.messageRef,
      message: args.message,
      occurredAt,
      reactionName,
      qualifyingUrl: args.qualifyingUrl,
      giverIds: reaction.users ?? [],
    });
  }

  return matchedTrackedReaction;
}

async function processMessage(
  runtime: RuntimeContext,
  message: SlackHistoryMessage
) {
  runtime.state.scannedMessages += 1;

  const requesterId = message.user;
  if (!requesterId) {
    runtime.state.skippedMissingAuthor += 1;
    return;
  }

  const messageRef = message.ts ?? "0";
  const qualifyingUrl = await runtime.findQualifyingUrl({
    messageTs: messageRef,
    messageText: message.text,
    includeThreadFallback: Boolean(
      message.thread_ts || (message.reply_count ?? 0) > 0
    ),
  });
  if (!qualifyingUrl) {
    runtime.state.skippedMissingUrl += 1;
    return;
  }

  incrementCount(
    runtime.state.qualifyingUrlHosts,
    new URL(qualifyingUrl).hostname
  );

  await ingestRequestForMessage(
    runtime,
    message,
    requesterId,
    qualifyingUrl,
    messageRef
  );

  const matchedTrackedReaction = await processMessageReactions({
    runtime,
    requesterId,
    message,
    messageRef,
    qualifyingUrl,
  });

  if (matchedTrackedReaction) {
    runtime.state.qualifyingMessages += 1;
    runtime.state.messagesWithTrackedReaction += 1;
  } else {
    runtime.state.skippedNoTrackedReactions += 1;
  }
}

async function fetchHistoryPageOrThrow(args: {
  botToken: string;
  channelId: string;
  cursor?: string;
  oldestTs?: string;
}) {
  const page = await fetchSlackHistoryPage(args);

  if (!page.ok) {
    throw new Error(
      `slack history fetch failed: ${page.error ?? "unknown_error"}`
    );
  }

  return page;
}

export async function runSlackBackfill(ctx: ActionCtx, args: BackfillArgs) {
  const botToken = process.env.SLACK_BOT_TOKEN;
  if (!botToken) {
    throw new Error("missing SLACK_BOT_TOKEN");
  }

  const maxMessages = boundedMaxMessages(args.maxMessages);
  const oldestTs = effectiveOldestTs(args.oldestTs);
  const trackedStampEmojis = getStampEmojiSet();
  const state = createBackfillState();
  const userCache = new Map<string, SlackUserSummary>();

  const getUserSummary = async (slackUserId: string) => {
    const cached = userCache.get(slackUserId);
    if (cached) {
      return cached;
    }

    const summary = await fetchSlackUserSummary({ botToken, slackUserId });
    userCache.set(slackUserId, summary);
    return summary;
  };

  const runtime: RuntimeContext = {
    ctx,
    channelId: args.channelId,
    trackedStampEmojis,
    state,
    getUserSummary,
    findQualifyingUrl: (params) =>
      findQualifyingReviewUrlWithThreadFallback({
        botToken,
        channelId: args.channelId,
        messageTs: params.messageTs,
        messageText: params.messageText,
        includeThreadFallback: params.includeThreadFallback,
      }),
  };

  let cursor: string | undefined;
  while (state.scannedMessages < maxMessages) {
    const page = await fetchHistoryPageOrThrow({
      botToken,
      channelId: args.channelId,
      cursor,
      oldestTs,
    });

    if (page.messages.length === 0) {
      break;
    }

    for (const message of page.messages) {
      if (state.scannedMessages >= maxMessages) {
        break;
      }
      await processMessage(runtime, message);
    }

    if (!page.nextCursor || page.messages.length < PAGE_SIZE) {
      break;
    }
    cursor = page.nextCursor;
  }

  const summary = buildSummary({
    state,
    channelId: args.channelId,
    trackedStampEmojis,
  });

  const requestedOldestTs = args.oldestTs ?? null;
  const appliedOldestTs = oldestTs;
  console.log("stamphog backfill summary", JSON.stringify(summary));
  return {
    ...summary,
    requestedOldestTs,
    appliedOldestTs,
    backfillWindowDays: BACKFILL_WINDOW_DAYS,
  };
}
