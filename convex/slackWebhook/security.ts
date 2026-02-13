function secureCompare(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length; index += 1) {
    if (a.charCodeAt(index) !== b.charCodeAt(index)) {
      return false;
    }
  }

  return true;
}

async function signSlackPayload(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  const signatureBytes = new Uint8Array(signatureBuffer);
  const signatureHex = Array.from(signatureBytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

  return `v0=${signatureHex}`;
}

export async function verifySlackWebhookSignature(
  request: Request,
  rawBody: string
) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    return new Response("missing SLACK_SIGNING_SECRET", { status: 500 });
  }

  const slackTimestamp = request.headers.get("x-slack-request-timestamp") ?? "";
  const slackSignature = request.headers.get("x-slack-signature") ?? "";
  if (!(slackTimestamp && slackSignature)) {
    return new Response("missing slack signature headers", { status: 401 });
  }

  const timestampAgeSeconds = Math.abs(
    Date.now() / 1000 - Number(slackTimestamp)
  );
  if (!Number.isFinite(timestampAgeSeconds) || timestampAgeSeconds > 60 * 5) {
    return new Response("stale slack request", { status: 401 });
  }

  const payloadBase = `v0:${slackTimestamp}:${rawBody}`;
  const expectedSignature = await signSlackPayload(signingSecret, payloadBase);

  if (!secureCompare(expectedSignature, slackSignature)) {
    return new Response("invalid slack signature", { status: 401 });
  }

  return null;
}
