import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import {
  handleSlackMessageEvent,
  handleSlackReactionEvent,
} from "./slackWebhook/handlers";
import { verifySlackWebhookSignature } from "./slackWebhook/security";
import type {
  SlackEventEnvelope,
  SlackMessageEvent,
  SlackReactionEvent,
} from "./slackWebhook/types";

const http = httpRouter();

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

    const envelope = payload as SlackEventEnvelope;

    if (envelope.type === "url_verification" && envelope.challenge) {
      return new Response(envelope.challenge, { status: 200 });
    }

    const signatureError = await verifySlackWebhookSignature(request, rawBody);
    if (signatureError) {
      return signatureError;
    }

    if (envelope.type !== "event_callback" || !envelope.event) {
      return Response.json({
        ok: true,
        ignored: true,
        reason: "not_event_callback",
      });
    }

    const botToken = process.env.SLACK_BOT_TOKEN;
    if (!botToken) {
      return new Response("missing SLACK_BOT_TOKEN", { status: 500 });
    }

    if (envelope.event.type === "message") {
      return handleSlackMessageEvent(
        ctx,
        envelope.event as SlackMessageEvent,
        botToken
      );
    }

    if (
      envelope.event.type === "reaction_added" ||
      envelope.event.type === "reaction_removed"
    ) {
      return handleSlackReactionEvent(
        ctx,
        envelope.event as SlackReactionEvent,
        botToken
      );
    }

    return Response.json({
      ok: true,
      ignored: true,
      reason: "event_not_handled",
    });
  }),
});

export default http;
