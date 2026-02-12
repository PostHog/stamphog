import { v } from "convex/values";
import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";
import {
  buildReactionDedupeKey,
  extractQualifyingReviewUrl,
  fetchSlackHistoryPage,
  fetchSlackUserSummary,
  getStampEmojiSet,
  normalizeEmoji,
  type SlackUserSummary,
} from "./slack";

const DAY_MS = 24 * 60 * 60 * 1000;
export const ingestReactionStamp = mutation({
  args: {
    giverSlackId: v.string(),
    requesterSlackId: v.string(),
    giverDisplayName: v.optional(v.string()),
    requesterDisplayName: v.optional(v.string()),
    giverImageUrl: v.optional(v.string()),
    requesterImageUrl: v.optional(v.string()),
    reaction: v.string(),
    occurredAt: v.optional(v.number()),
    channelId: v.string(),
    prUrl: v.optional(v.string()),
    note: v.optional(v.string()),
    dedupeKey: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("stampEvents")
      .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", args.dedupeKey))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        giverDisplayName: args.giverDisplayName ?? existing.giverDisplayName,
        requesterDisplayName:
          args.requesterDisplayName ?? existing.requesterDisplayName,
        giverImageUrl: args.giverImageUrl ?? existing.giverImageUrl,
        requesterImageUrl: args.requesterImageUrl ?? existing.requesterImageUrl,
      });
      return { duplicateSkipped: true, eventId: existing._id };
    }

    const now = Date.now();
    const eventId = await ctx.db.insert("stampEvents", {
      giverSlackUserId: args.giverSlackId,
      requesterSlackUserId: args.requesterSlackId,
      giverDisplayName: args.giverDisplayName ?? args.giverSlackId,
      requesterDisplayName: args.requesterDisplayName ?? args.requesterSlackId,
      giverImageUrl: args.giverImageUrl,
      requesterImageUrl: args.requesterImageUrl,
      stampCount: 1,
      occurredAt: args.occurredAt ?? now,
      source: `slack:reaction:${args.reaction}`,
      channelId: args.channelId,
      prUrl: args.prUrl,
      note: args.note,
      dedupeKey: args.dedupeKey,
    });
    return { duplicateSkipped: false, eventId };
  },
});

export const removeReactionStamp = mutation({
  args: {
    dedupeKey: v.string(),
    giverSlackId: v.string(),
    requesterSlackId: v.string(),
    reaction: v.string(),
    channelId: v.string(),
  },
  handler: async (ctx, args) => {
    const byDedupe = await ctx.db
      .query("stampEvents")
      .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", args.dedupeKey))
      .collect();

    if (byDedupe.length > 0) {
      for (const event of byDedupe) {
        await ctx.db.delete(event._id);
      }
      return { removed: byDedupe.length, strategy: "by_dedupe_key" as const };
    }

    const source = `slack:reaction:${args.reaction}`;
    const fallbackMatches = await ctx.db
      .query("stampEvents")
      .filter((q) =>
        q.and(
          q.eq(q.field("giverSlackUserId"), args.giverSlackId),
          q.eq(q.field("requesterSlackUserId"), args.requesterSlackId),
          q.eq(q.field("channelId"), args.channelId),
          q.eq(q.field("source"), source)
        )
      )
      .collect();

    for (const event of fallbackMatches) {
      await ctx.db.delete(event._id);
    }

    return { removed: fallbackMatches.length, strategy: "fallback_scan" as const };
  },
});

export const leaderboard = query({
  args: { windowDays: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(100, Math.floor(args.limit ?? 25)));
    const since =
      args.windowDays && args.windowDays > 0
        ? Date.now() - Math.floor(args.windowDays) * DAY_MS
        : undefined;

    const events = since
      ? await ctx.db
          .query("stampEvents")
          .withIndex("by_occurred_at", (q) => q.gte("occurredAt", since))
          .collect()
      : await ctx.db.query("stampEvents").collect();

    const giverMap = new Map<
      string,
      {
        slackUserId: string;
        displayName: string;
        imageUrl?: string;
        stampsGiven: number;
        approvalsGiven: number;
      }
    >();
    const requesterMap = new Map<
      string,
      {
        slackUserId: string;
        displayName: string;
        imageUrl?: string;
        stampsRequested: number;
        approvalsReceived: number;
      }
    >();

    for (const event of events) {
      const giver = giverMap.get(event.giverSlackUserId) ?? {
        slackUserId: event.giverSlackUserId,
        displayName: event.giverDisplayName,
        imageUrl: event.giverImageUrl,
        stampsGiven: 0,
        approvalsGiven: 0,
      };
      giver.stampsGiven += event.stampCount;
      giver.approvalsGiven += 1;
      giverMap.set(event.giverSlackUserId, giver);

      const requester = requesterMap.get(event.requesterSlackUserId) ?? {
        slackUserId: event.requesterSlackUserId,
        displayName: event.requesterDisplayName,
        imageUrl: event.requesterImageUrl,
        stampsRequested: 0,
        approvalsReceived: 0,
      };
      requester.stampsRequested += event.stampCount;
      requester.approvalsReceived += 1;
      requesterMap.set(event.requesterSlackUserId, requester);
    }

    const byGivenStamps = (
      a: { stampsGiven: number; approvalsGiven: number },
      b: { stampsGiven: number; approvalsGiven: number }
    ) => b.stampsGiven - a.stampsGiven || b.approvalsGiven - a.approvalsGiven;

    const byRequestedStamps = (
      a: { stampsRequested: number; approvalsReceived: number },
      b: { stampsRequested: number; approvalsReceived: number }
    ) =>
      b.stampsRequested - a.stampsRequested ||
      b.approvalsReceived - a.approvalsReceived;

    return {
      generatedAt: Date.now(),
      windowDays: args.windowDays ?? null,
      totals: {
        events: events.length,
        stamps: events.reduce((sum, event) => sum + event.stampCount, 0),
      },
      givers: Array.from(giverMap.values()).sort(byGivenStamps).slice(0, limit),
      requesters: Array.from(requesterMap.values())
        .sort(byRequestedStamps)
        .slice(0, limit),
    };
  },
});

export const recentEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(100, Math.floor(args.limit ?? 20)));
    return await ctx.db
      .query("stampEvents")
      .withIndex("by_occurred_at")
      .order("desc")
      .take(limit);
  },
});

function incrementCount(
  map: Map<string, number>,
  key: string | undefined,
  amount = 1
) {
  if (!key) {
    return;
  }
  map.set(key, (map.get(key) ?? 0) + amount);
}

function topCounts(map: Map<string, number>, limit = 20) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

export const backfillChannel = action({
  args: {
    channelId: v.string(),
    oldestTs: v.optional(v.string()),
    maxMessages: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const botToken = process.env.SLACK_BOT_TOKEN;
    if (!botToken) {
      throw new Error("missing SLACK_BOT_TOKEN");
    }

    const maxMessages = Math.max(1, Math.min(50000, Math.floor(args.maxMessages ?? 5000)));
    const stampEmojis = getStampEmojiSet();
    const userCache = new Map<string, SlackUserSummary>();
    let cursor: string | undefined;
    let scannedMessages = 0;
    let qualifyingMessages = 0;
    let createdEvents = 0;
    let duplicateEvents = 0;
    let skippedSelfReactions = 0;
    let skippedMissingUrl = 0;
    let skippedMissingAuthor = 0;
    let skippedNoReactions = 0;
    let skippedNoTrackedReactions = 0;
    let messagesWithAnyReaction = 0;
    let messagesWithTrackedReaction = 0;
    const allReactionNames = new Map<string, number>();
    const trackedReactionNames = new Map<string, number>();
    const untrackedReactionNames = new Map<string, number>();
    const qualifyingUrlHosts = new Map<string, number>();

    const getUserSummary = async (slackUserId: string) => {
      const cached = userCache.get(slackUserId);
      if (cached) {
        return cached;
      }
      const summary = await fetchSlackUserSummary({
        botToken,
        slackUserId,
      });
      userCache.set(slackUserId, summary);
      return summary;
    };

    while (scannedMessages < maxMessages) {
      const page = await fetchSlackHistoryPage({
        botToken,
        channelId: args.channelId,
        cursor,
        oldestTs: args.oldestTs,
      });

      if (!page.ok) {
        throw new Error(`slack history fetch failed: ${page.error ?? "unknown_error"}`);
      }
      if (page.messages.length === 0) {
        break;
      }

      for (const message of page.messages) {
        if (scannedMessages >= maxMessages) {
          break;
        }
        scannedMessages += 1;

        const requesterSlackId = message.user;
        if (!requesterSlackId) {
          skippedMissingAuthor += 1;
          continue;
        }

        const qualifyingUrl = extractQualifyingReviewUrl(message.text);
        if (!qualifyingUrl) {
          skippedMissingUrl += 1;
          continue;
        }
        incrementCount(qualifyingUrlHosts, new URL(qualifyingUrl).hostname);

        const reactions = message.reactions ?? [];
        if (reactions.length === 0) {
          skippedNoReactions += 1;
          continue;
        }
        messagesWithAnyReaction += 1;
        const occurredAt = message.ts ? Math.floor(Number(message.ts) * 1000) : undefined;
        let matchedAnyReaction = false;

        for (const reaction of reactions) {
          const reactionName = normalizeEmoji(reaction.name ?? "");
          incrementCount(allReactionNames, reactionName);
          if (!stampEmojis.has(reactionName)) {
            incrementCount(untrackedReactionNames, reactionName);
            continue;
          }
          matchedAnyReaction = true;
          incrementCount(trackedReactionNames, reactionName);
          for (const giverSlackId of reaction.users ?? []) {
            if (giverSlackId === requesterSlackId) {
              skippedSelfReactions += 1;
              continue;
            }

            const [giver, requester] = await Promise.all([
              getUserSummary(giverSlackId),
              getUserSummary(requesterSlackId),
            ]);
            const dedupeKey = buildReactionDedupeKey({
              channelId: args.channelId,
              messageTs: message.ts ?? "0",
              reaction: reactionName,
              giverSlackId,
            });
            const result = await ctx.runMutation(api.stamps.ingestReactionStamp, {
              giverSlackId,
              requesterSlackId,
              giverDisplayName: giver.displayName,
              requesterDisplayName: requester.displayName,
              giverImageUrl: giver.imageUrl,
              requesterImageUrl: requester.imageUrl,
              reaction: reactionName,
              occurredAt,
              channelId: args.channelId,
              prUrl: qualifyingUrl,
              note: message.text,
              dedupeKey,
            });
            if (result.duplicateSkipped) {
              duplicateEvents += 1;
            } else {
              createdEvents += 1;
            }
          }
        }

        if (matchedAnyReaction) {
          qualifyingMessages += 1;
          messagesWithTrackedReaction += 1;
        } else {
          skippedNoTrackedReactions += 1;
        }
      }

      if (!page.nextCursor) {
        break;
      }
      cursor = page.nextCursor;
    }

    const summary = {
      channelId: args.channelId,
      scannedMessages,
      qualifyingMessages,
      createdEvents,
      duplicateEvents,
      skippedSelfReactions,
      skippedMissingUrl,
      skippedMissingAuthor,
      skippedNoReactions,
      skippedNoTrackedReactions,
      messagesWithAnyReaction,
      messagesWithTrackedReaction,
      topAllReactionNames: topCounts(allReactionNames),
      topTrackedReactionNames: topCounts(trackedReactionNames),
      topUntrackedReactionNames: topCounts(untrackedReactionNames),
      qualifyingUrlHosts: topCounts(qualifyingUrlHosts),
      trackedEmojiSet: Array.from(stampEmojis.values()).sort(),
    };

    console.log("stamphog backfill summary", JSON.stringify(summary));
    return summary;
  },
});
