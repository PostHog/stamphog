import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  stampEvents: defineTable({
    giverSlackUserId: v.string(),
    giverDisplayName: v.string(),
    giverImageUrl: v.optional(v.string()),
    requesterSlackUserId: v.string(),
    requesterDisplayName: v.string(),
    requesterImageUrl: v.optional(v.string()),
    stampCount: v.number(),
    occurredAt: v.number(),
    source: v.string(),
    channelId: v.optional(v.string()),
    prUrl: v.optional(v.string()),
    note: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
  })
    .index("by_occurred_at", ["occurredAt"])
    .index("by_dedupe_key", ["dedupeKey"]),
});
