import { httpRouter } from "convex/server";
import { api } from "./_generated/api";
import { httpAction } from "./_generated/server";
import {
  buildReactionDedupeKey,
  extractQualifyingReviewUrl,
  fetchSlackMessageAtTimestamp,
  fetchSlackUserSummary,
  getStampEmojiSet,
  normalizeEmoji,
} from "./slack";

const http = httpRouter();

function secureCompare(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a.charCodeAt(i) !== b.charCodeAt(i)) {
      return false;
    }
  }
  return true;
}

async function signSlackPayload(secret: string, base: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(base)
  );
  const bytes = new Uint8Array(sigBuffer);
  return `v0=${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function verifySlackSignature(request: Request, rawBody: string) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    return new Response("missing SLACK_SIGNING_SECRET", { status: 500 });
  }

  const slackTimestamp = request.headers.get("x-slack-request-timestamp") ?? "";
  const slackSignature = request.headers.get("x-slack-signature") ?? "";
  if (!(slackTimestamp && slackSignature)) {
    return new Response("missing slack signature headers", { status: 401 });
  }

  const timestampAge = Math.abs(Date.now() / 1000 - Number(slackTimestamp));
  if (!Number.isFinite(timestampAge) || timestampAge > 60 * 5) {
    return new Response("stale slack request", { status: 401 });
  }

  const expectedSig = await signSlackPayload(
    signingSecret,
    `v0:${slackTimestamp}:${rawBody}`
  );
  if (!secureCompare(expectedSig, slackSignature)) {
    return new Response("invalid slack signature", { status: 401 });
  }
  return null;
}

http.route({
  path: "/slack/stamps",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response("invalid json body", { status: 400 });
    }

    const parsedPayload = payload as { type?: string; challenge?: string; event?: any; event_id?: string };
    if (parsedPayload.type === "url_verification" && parsedPayload.challenge) {
      return new Response(parsedPayload.challenge, { status: 200 });
    }

    const authError = await verifySlackSignature(request, rawBody);
    if (authError) {
      return authError;
    }

    if (parsedPayload.type !== "event_callback") {
      return Response.json({ ok: true, ignored: true, reason: "not_event_callback" });
    }

    const event = parsedPayload.event;
    if (event?.type !== "reaction_added" && event?.type !== "reaction_removed") {
      return Response.json({ ok: true, ignored: true, reason: "event_not_handled" });
    }

    const normalizedReaction = normalizeEmoji(event.reaction ?? "");
    if (!getStampEmojiSet().has(normalizedReaction)) {
      return Response.json({
        ok: true,
        ignored: true,
        reason: "emoji_not_tracked",
      });
    }

    const giverSlackId = event.user;
    const channelId = event.item?.channel;
    const messageTs = event.item?.ts;
    if (!(giverSlackId && channelId && messageTs)) {
      return new Response("missing reaction event fields", { status: 400 });
    }

    const botToken = process.env.SLACK_BOT_TOKEN;
    if (!botToken) {
      return new Response("missing SLACK_BOT_TOKEN", { status: 500 });
    }

    const message = await fetchSlackMessageAtTimestamp({
      botToken,
      channelId,
      messageTs,
    });
    const requesterSlackId = message?.user;
    if (!requesterSlackId) {
      return new Response("could not resolve message author", { status: 400 });
    }

    const qualifyingUrl = extractQualifyingReviewUrl(message.text);
    if (!qualifyingUrl) {
      return Response.json({
        ok: true,
        ignored: true,
        reason: "missing_qualifying_review_url",
      });
    }

    const eventTimestamp = Number(event.event_ts);
    const dedupeKey = buildReactionDedupeKey({
      channelId,
      messageTs,
      reaction: normalizedReaction,
      giverSlackId,
    });

    if (event.type === "reaction_removed") {
      const result = await ctx.runMutation(api.stamps.removeReactionStamp, {
        dedupeKey,
        giverSlackId,
        requesterSlackId,
        reaction: normalizedReaction,
        channelId,
      });
      return Response.json({
        ok: true,
        removed: result.removed,
        strategy: result.strategy,
      });
    }

    const [giver, requester] = await Promise.all([
      fetchSlackUserSummary({ botToken, slackUserId: giverSlackId }),
      fetchSlackUserSummary({ botToken, slackUserId: requesterSlackId }),
    ]);

    const result = await ctx.runMutation(api.stamps.ingestReactionStamp, {
      giverSlackId,
      requesterSlackId,
      giverDisplayName: giver.displayName,
      requesterDisplayName: requester.displayName,
      giverImageUrl: giver.imageUrl,
      requesterImageUrl: requester.imageUrl,
      reaction: normalizedReaction,
      occurredAt: Number.isFinite(eventTimestamp)
        ? Math.floor(eventTimestamp * 1000)
        : undefined,
      channelId,
      prUrl: qualifyingUrl,
      note: message.text,
      dedupeKey,
    });

    return Response.json({ ok: true, duplicateSkipped: result.duplicateSkipped });
  }),
});

export default http;
