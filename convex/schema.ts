import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  actors: defineTable({
    actorId: v.string(),
    displayName: v.string(),
    imageUrl: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_actor_id", ["actorId"]),

  requests: defineTable({
    requesterId: v.string(),
    channelId: v.string(),
    messageRef: v.string(),
    occurredAt: v.number(),
    prUrl: v.string(),
    dedupeKey: v.string(),
  })
    .index("by_occurred_at", ["occurredAt"])
    .index("by_requester_occurred_at", ["requesterId", "occurredAt"])
    .index("by_dedupe_key", ["dedupeKey"]),

  stampEvents: defineTable({
    giverId: v.string(),
    requesterId: v.string(),
    stampCount: v.number(),
    occurredAt: v.number(),
    source: v.string(),
    channelId: v.optional(v.string()),
    prUrl: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
  })
    .index("by_occurred_at", ["occurredAt"])
    .index("by_dedupe_key", ["dedupeKey"]),
});
