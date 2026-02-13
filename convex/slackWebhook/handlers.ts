import { api } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import {
  buildReactionDedupeKey,
  buildRequestDedupeKey,
  fetchSlackMessageAtTimestamp,
  fetchSlackUserSummary,
  findQualifyingReviewUrlWithThreadFallback,
  getStampEmojiSet,
  normalizeEmoji,
} from "../slack";
import type { SlackMessageEvent, SlackReactionEvent } from "./types";

function toOccurredAtMs(eventTs: string | undefined) {
  const parsed = Number(eventTs);
  return Number.isFinite(parsed) ? Math.floor(parsed * 1000) : undefined;
}

function shouldCheckThreadFallback(args: {
  threadTs?: string;
  replyCount?: number;
}) {
  return Boolean(args.threadTs || (args.replyCount ?? 0) > 0);
}

export async function handleSlackMessageEvent(
  ctx: ActionCtx,
  event: SlackMessageEvent,
  botToken: string
) {
  if (event.subtype) {
    return Response.json({
      ok: true,
      ignored: true,
      reason: "message_subtype",
    });
  }

  const requesterId = event.user;
  const channelId = event.channel;
  const messageTs = event.ts;
  if (!(requesterId && channelId && messageTs)) {
    return new Response("missing message event fields", { status: 400 });
  }

  const qualifyingUrl = await findQualifyingReviewUrlWithThreadFallback({
    botToken,
    channelId,
    messageTs,
    messageText: event.text,
    includeThreadFallback: shouldCheckThreadFallback({
      threadTs: event.thread_ts,
      replyCount: event.reply_count,
    }),
  });
  if (!qualifyingUrl) {
    return Response.json({
      ok: true,
      ignored: true,
      reason: "missing_qualifying_review_url",
    });
  }

  const requester = await fetchSlackUserSummary({
    botToken,
    slackUserId: requesterId,
  });

  const result = await ctx.runMutation(api.stamps.ingestRequestMessage, {
    requesterId,
    requesterDisplayName: requester.displayName,
    requesterImageUrl: requester.imageUrl,
    channelId,
    messageRef: messageTs,
    occurredAt: toOccurredAtMs(event.event_ts ?? messageTs),
    prUrl: qualifyingUrl,
    note: event.text,
    dedupeKey: buildRequestDedupeKey({ channelId, messageTs }),
  });

  return Response.json({ ok: true, duplicateSkipped: result.duplicateSkipped });
}

export async function handleSlackReactionEvent(
  ctx: ActionCtx,
  event: SlackReactionEvent,
  botToken: string
) {
  const normalizedReaction = normalizeEmoji(event.reaction ?? "");
  if (!getStampEmojiSet().has(normalizedReaction)) {
    return Response.json({
      ok: true,
      ignored: true,
      reason: "emoji_not_tracked",
    });
  }

  const giverId = event.user;
  const channelId = event.item?.channel;
  const messageTs = event.item?.ts;
  if (!(giverId && channelId && messageTs)) {
    return new Response("missing reaction event fields", { status: 400 });
  }

  const message = await fetchSlackMessageAtTimestamp({
    botToken,
    channelId,
    messageTs,
  });
  const requesterId = message?.user;
  if (!requesterId) {
    return new Response("could not resolve message author", { status: 400 });
  }

  const qualifyingUrl = await findQualifyingReviewUrlWithThreadFallback({
    botToken,
    channelId,
    messageTs,
    messageText: message.text,
    includeThreadFallback: shouldCheckThreadFallback({
      threadTs: message.thread_ts,
      replyCount: message.reply_count,
    }),
  });
  if (!qualifyingUrl) {
    return Response.json({
      ok: true,
      ignored: true,
      reason: "missing_qualifying_review_url",
    });
  }

  const requester = await fetchSlackUserSummary({
    botToken,
    slackUserId: requesterId,
  });

  await ctx.runMutation(api.stamps.ingestRequestMessage, {
    requesterId,
    requesterDisplayName: requester.displayName,
    requesterImageUrl: requester.imageUrl,
    channelId,
    messageRef: messageTs,
    occurredAt: toOccurredAtMs(event.event_ts),
    prUrl: qualifyingUrl,
    note: message.text,
    dedupeKey: buildRequestDedupeKey({ channelId, messageTs }),
  });

  const dedupeKey = buildReactionDedupeKey({
    channelId,
    messageTs,
    reaction: normalizedReaction,
    giverSlackId: giverId,
  });
  const source = `slack:reaction:${normalizedReaction}`;

  if (event.type === "reaction_removed") {
    const result = await ctx.runMutation(api.stamps.removeReactionStamp, {
      dedupeKey,
      giverId,
      requesterId,
      reaction: normalizedReaction,
      source,
      channelId,
    });

    return Response.json({
      ok: true,
      removed: result.removed,
      strategy: result.strategy,
    });
  }

  const giver = await fetchSlackUserSummary({
    botToken,
    slackUserId: giverId,
  });

  const result = await ctx.runMutation(api.stamps.ingestReactionStamp, {
    giverId,
    requesterId,
    giverDisplayName: giver.displayName,
    requesterDisplayName: requester.displayName,
    giverImageUrl: giver.imageUrl,
    requesterImageUrl: requester.imageUrl,
    reaction: normalizedReaction,
    source,
    occurredAt: toOccurredAtMs(event.event_ts),
    channelId,
    prUrl: qualifyingUrl,
    note: message.text,
    dedupeKey,
  });

  return Response.json({ ok: true, duplicateSkipped: result.duplicateSkipped });
}
