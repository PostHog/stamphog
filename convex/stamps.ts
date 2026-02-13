import { v } from "convex/values";
import {
  action,
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import { runSlackBackfill } from "./slackWebhook/backfill";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LEADERBOARD_LIMIT = 20;
const DEFAULT_RECENT_EVENTS_LIMIT = 23;
const MAX_RESULTS_LIMIT = 100;

interface ActorProfile {
  displayName: string;
  imageUrl?: string;
}

export interface GiverAggregate {
  actorId: string;
  displayName: string;
  imageUrl?: string;
  stampsGiven: number;
  approvalsGiven: number;
}

export interface RequesterAggregate {
  actorId: string;
  displayName: string;
  imageUrl?: string;
  requestsPosted: number;
  stampsRequested: number;
  approvalsReceived: number;
}

function clampLimit(value: number | undefined, fallback: number) {
  return Math.max(
    1,
    Math.min(MAX_RESULTS_LIMIT, Math.floor(value ?? fallback))
  );
}

function getSinceTimestamp(windowDays: number | undefined) {
  if (!(windowDays && windowDays > 0)) {
    return undefined;
  }
  return Date.now() - Math.floor(windowDays) * DAY_MS;
}

function sortByGivenStamps(a: GiverAggregate, b: GiverAggregate) {
  return b.stampsGiven - a.stampsGiven || b.approvalsGiven - a.approvalsGiven;
}

function sortByRequestedStamps(a: RequesterAggregate, b: RequesterAggregate) {
  return (
    b.stampsRequested - a.stampsRequested ||
    b.approvalsReceived - a.approvalsReceived ||
    b.requestsPosted - a.requestsPosted
  );
}

async function upsertActorProfile(
  ctx: MutationCtx,
  args: {
    actorId: string;
    displayName?: string;
    imageUrl?: string;
  }
) {
  const existing = await ctx.db
    .query("actors")
    .withIndex("by_actor_id", (q) => q.eq("actorId", args.actorId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      displayName: args.displayName ?? existing.displayName,
      imageUrl: args.imageUrl ?? existing.imageUrl,
      updatedAt: Date.now(),
    });
    return;
  }

  await ctx.db.insert("actors", {
    actorId: args.actorId,
    displayName: args.displayName ?? args.actorId,
    imageUrl: args.imageUrl,
    updatedAt: Date.now(),
  });
}

async function getActorProfileMap(
  ctx: QueryCtx
): Promise<Map<string, ActorProfile>> {
  const actors = await ctx.db.query("actors").collect();
  const actorMap = new Map<string, ActorProfile>();

  for (const actor of actors) {
    actorMap.set(actor.actorId, {
      displayName: actor.displayName,
      imageUrl: actor.imageUrl,
    });
  }

  return actorMap;
}

function resolveActorProfile(
  actorMap: Map<string, ActorProfile>,
  actorId: string
): ActorProfile {
  return actorMap.get(actorId) ?? { displayName: actorId };
}

export const ingestRequestMessage = mutation({
  args: {
    requesterId: v.string(),
    requesterDisplayName: v.optional(v.string()),
    requesterImageUrl: v.optional(v.string()),
    channelId: v.string(),
    messageRef: v.string(),
    occurredAt: v.optional(v.number()),
    prUrl: v.string(),
    dedupeKey: v.string(),
  },
  handler: async (ctx, args) => {
    await upsertActorProfile(ctx, {
      actorId: args.requesterId,
      displayName: args.requesterDisplayName,
      imageUrl: args.requesterImageUrl,
    });

    const existingRequest = await ctx.db
      .query("requests")
      .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", args.dedupeKey))
      .first();

    if (existingRequest) {
      await ctx.db.patch(existingRequest._id, {
        prUrl: args.prUrl,
      });

      return { duplicateSkipped: true, requestId: existingRequest._id };
    }

    const requestId = await ctx.db.insert("requests", {
      requesterId: args.requesterId,
      channelId: args.channelId,
      messageRef: args.messageRef,
      occurredAt: args.occurredAt ?? Date.now(),
      prUrl: args.prUrl,
      dedupeKey: args.dedupeKey,
    });

    return { duplicateSkipped: false, requestId };
  },
});

export const ingestReactionStamp = mutation({
  args: {
    giverId: v.string(),
    requesterId: v.string(),
    giverDisplayName: v.optional(v.string()),
    requesterDisplayName: v.optional(v.string()),
    giverImageUrl: v.optional(v.string()),
    requesterImageUrl: v.optional(v.string()),
    reaction: v.string(),
    source: v.optional(v.string()),
    occurredAt: v.optional(v.number()),
    channelId: v.string(),
    prUrl: v.optional(v.string()),
    dedupeKey: v.string(),
  },
  handler: async (ctx, args) => {
    await Promise.all([
      upsertActorProfile(ctx, {
        actorId: args.giverId,
        displayName: args.giverDisplayName,
        imageUrl: args.giverImageUrl,
      }),
      upsertActorProfile(ctx, {
        actorId: args.requesterId,
        displayName: args.requesterDisplayName,
        imageUrl: args.requesterImageUrl,
      }),
    ]);

    const existingEvent = await ctx.db
      .query("stampEvents")
      .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", args.dedupeKey))
      .first();

    if (existingEvent) {
      return { duplicateSkipped: true, eventId: existingEvent._id };
    }

    const eventId = await ctx.db.insert("stampEvents", {
      giverId: args.giverId,
      requesterId: args.requesterId,
      stampCount: 1,
      occurredAt: args.occurredAt ?? Date.now(),
      source: args.source ?? `stamp:${args.reaction}`,
      channelId: args.channelId,
      prUrl: args.prUrl,
      dedupeKey: args.dedupeKey,
    });

    return { duplicateSkipped: false, eventId };
  },
});

export const removeReactionStamp = mutation({
  args: {
    dedupeKey: v.string(),
    giverId: v.string(),
    requesterId: v.string(),
    reaction: v.string(),
    source: v.optional(v.string()),
    channelId: v.string(),
  },
  handler: async (ctx, args) => {
    const exactMatches = await ctx.db
      .query("stampEvents")
      .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", args.dedupeKey))
      .collect();

    if (exactMatches.length > 0) {
      for (const event of exactMatches) {
        await ctx.db.delete(event._id);
      }
      return {
        removed: exactMatches.length,
        strategy: "by_dedupe_key" as const,
      };
    }

    const eventSource = args.source ?? `stamp:${args.reaction}`;
    const fallbackMatches = await ctx.db
      .query("stampEvents")
      .filter((q) =>
        q.and(
          q.eq(q.field("giverId"), args.giverId),
          q.eq(q.field("requesterId"), args.requesterId),
          q.eq(q.field("channelId"), args.channelId),
          q.eq(q.field("source"), eventSource)
        )
      )
      .collect();

    for (const event of fallbackMatches) {
      await ctx.db.delete(event._id);
    }

    return {
      removed: fallbackMatches.length,
      strategy: "fallback_scan" as const,
    };
  },
});

export const leaderboard = query({
  args: { windowDays: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = clampLimit(args.limit, DEFAULT_LEADERBOARD_LIMIT);
    const since = getSinceTimestamp(args.windowDays);

    const [stampEvents, requests, actorMap] = await Promise.all([
      since
        ? ctx.db
            .query("stampEvents")
            .withIndex("by_occurred_at", (q) => q.gte("occurredAt", since))
            .collect()
        : ctx.db.query("stampEvents").collect(),
      since
        ? ctx.db
            .query("requests")
            .withIndex("by_occurred_at", (q) => q.gte("occurredAt", since))
            .collect()
        : ctx.db.query("requests").collect(),
      getActorProfileMap(ctx),
    ]);

    const giversById = new Map<string, GiverAggregate>();
    const requestersById = new Map<string, RequesterAggregate>();

    for (const request of requests) {
      const profile = resolveActorProfile(actorMap, request.requesterId);
      const requester = requestersById.get(request.requesterId) ?? {
        actorId: request.requesterId,
        displayName: profile.displayName,
        imageUrl: profile.imageUrl,
        requestsPosted: 0,
        stampsRequested: 0,
        approvalsReceived: 0,
      };

      requester.requestsPosted += 1;
      requestersById.set(request.requesterId, requester);
    }

    for (const event of stampEvents) {
      const giverProfile = resolveActorProfile(actorMap, event.giverId);
      const giver = giversById.get(event.giverId) ?? {
        actorId: event.giverId,
        displayName: giverProfile.displayName,
        imageUrl: giverProfile.imageUrl,
        stampsGiven: 0,
        approvalsGiven: 0,
      };
      giver.stampsGiven += event.stampCount;
      giver.approvalsGiven += 1;
      giversById.set(event.giverId, giver);

      const requesterProfile = resolveActorProfile(actorMap, event.requesterId);
      const requester = requestersById.get(event.requesterId) ?? {
        actorId: event.requesterId,
        displayName: requesterProfile.displayName,
        imageUrl: requesterProfile.imageUrl,
        requestsPosted: 0,
        stampsRequested: 0,
        approvalsReceived: 0,
      };
      requester.stampsRequested += event.stampCount;
      requester.approvalsReceived += 1;
      requestersById.set(event.requesterId, requester);
    }

    return {
      generatedAt: Date.now(),
      windowDays: args.windowDays ?? null,
      totals: {
        events: stampEvents.length,
        stamps: stampEvents.reduce((sum, event) => sum + event.stampCount, 0),
        requests: requests.length,
      },
      givers: Array.from(giversById.values())
        .sort(sortByGivenStamps)
        .slice(0, limit),
      requesters: Array.from(requestersById.values())
        .filter((requester) => requester.stampsRequested > 0)
        .sort(sortByRequestedStamps)
        .slice(0, limit),
    };
  },
});

export const recentEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = clampLimit(args.limit, DEFAULT_RECENT_EVENTS_LIMIT);
    // Fetch more than needed from each table so we can merge and trim
    const [stamps, requests, actorMap] = await Promise.all([
      ctx.db
        .query("stampEvents")
        .withIndex("by_occurred_at")
        .order("desc")
        .take(limit),
      ctx.db
        .query("requests")
        .withIndex("by_occurred_at")
        .order("desc")
        .take(limit),
      getActorProfileMap(ctx),
    ]);

    const stampItems = stamps.map((event) => {
      const giver = resolveActorProfile(actorMap, event.giverId);
      const requester = resolveActorProfile(actorMap, event.requesterId);
      return {
        _id: event._id,
        _creationTime: event._creationTime,
        type: "stamp" as const,
        occurredAt: event.occurredAt,
        prUrl: event.prUrl,
        giverId: event.giverId,
        giverDisplayName: giver.displayName,
        giverImageUrl: giver.imageUrl,
        requesterId: event.requesterId,
        requesterDisplayName: requester.displayName,
        requesterImageUrl: requester.imageUrl,
      };
    });

    const requestItems = requests.map((request) => {
      const requester = resolveActorProfile(actorMap, request.requesterId);
      return {
        _id: request._id,
        _creationTime: request._creationTime,
        type: "request" as const,
        occurredAt: request.occurredAt,
        prUrl: request.prUrl,
        requesterId: request.requesterId,
        requesterDisplayName: requester.displayName,
        requesterImageUrl: requester.imageUrl,
      };
    });

    return [...stampItems, ...requestItems]
      .sort((a, b) => b.occurredAt - a.occurredAt)
      .slice(0, limit);
  },
});

function getChannelIds(): string[] {
  const raw = process.env.CHANNEL_IDS;
  if (!raw) {
    throw new Error("missing CHANNEL_IDS env var");
  }
  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.length === 0) {
    throw new Error("CHANNEL_IDS env var is empty");
  }
  return ids;
}

export const backfill = action({
  args: {},
  handler: async (ctx) => {
    const channelIds = getChannelIds();

    const failures: Array<{ channelId: string; error: string }> = [];
    let totalScannedMessages = 0;
    let totalCreatedEvents = 0;
    let totalCreatedRequests = 0;

    for (const channelId of channelIds) {
      try {
        const summary = await runSlackBackfill(ctx, { channelId });
        totalScannedMessages += summary.scannedMessages;
        totalCreatedEvents += summary.createdEvents;
        totalCreatedRequests += summary.createdRequests;
      } catch (error) {
        failures.push({
          channelId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      channels: channelIds.length,
      failures,
      totalScannedMessages,
      totalCreatedEvents,
      totalCreatedRequests,
    };
  },
});

const DATA_RETENTION_DAYS = 90;

export const pruneDataOlderThanRetentionWindow = mutation({
  args: {},
  handler: async (ctx) => {
    const cutoffMs = Date.now() - DATA_RETENTION_DAYS * DAY_MS;

    const [staleRequests, staleEvents] = await Promise.all([
      ctx.db
        .query("requests")
        .withIndex("by_occurred_at", (q) => q.lt("occurredAt", cutoffMs))
        .collect(),
      ctx.db
        .query("stampEvents")
        .withIndex("by_occurred_at", (q) => q.lt("occurredAt", cutoffMs))
        .collect(),
    ]);

    for (const request of staleRequests) {
      await ctx.db.delete(request._id);
    }
    for (const event of staleEvents) {
      await ctx.db.delete(event._id);
    }

    const [remainingRequests, remainingEvents, actors] = await Promise.all([
      ctx.db.query("requests").collect(),
      ctx.db.query("stampEvents").collect(),
      ctx.db.query("actors").collect(),
    ]);

    const activeActorIds = new Set<string>();
    for (const request of remainingRequests) {
      activeActorIds.add(request.requesterId);
    }
    for (const event of remainingEvents) {
      activeActorIds.add(event.giverId);
      activeActorIds.add(event.requesterId);
    }

    let deletedActors = 0;
    for (const actor of actors) {
      if (activeActorIds.has(actor.actorId)) {
        continue;
      }
      await ctx.db.delete(actor._id);
      deletedActors += 1;
    }

    return {
      retentionDays: DATA_RETENTION_DAYS,
      cutoffMs,
      deletedRequests: staleRequests.length,
      deletedStampEvents: staleEvents.length,
      deletedActors,
      remaining: {
        requests: remainingRequests.length,
        stampEvents: remainingEvents.length,
        actors: actors.length - deletedActors,
      },
    };
  },
});
