const COLON_REGEX = /:/g;
const URL_GLOBAL_REGEX = /https?:\/\/[^\s>]+/g;
const TRACKED_STAMP_EMOJIS = [
  "stampstamp",
  "white_check_mark",
  "heavy_check_mark",
  "stamp",
  "white_tick",
];

interface SlackUserProfile {
  display_name?: string;
  display_name_normalized?: string;
  real_name?: string;
  real_name_normalized?: string;
  image_24?: string;
  image_32?: string;
  image_48?: string;
  image_72?: string;
  image_192?: string;
}

interface SlackUserInfoResponse {
  ok?: boolean;
  error?: string;
  user?: {
    id?: string;
    name?: string;
    real_name?: string;
    profile?: SlackUserProfile;
  };
}

export interface SlackUserSummary {
  slackUserId: string;
  displayName: string;
  imageUrl?: string;
}

export interface SlackReaction {
  name?: string;
  users?: string[];
}
export interface SlackHistoryMessage {
  ts?: string;
  thread_ts?: string;
  reply_count?: number;
  user?: string;
  text?: string;
  reactions?: SlackReaction[];
}

interface SlackHistoryResponse {
  ok?: boolean;
  error?: string;
  messages?: SlackHistoryMessage[];
  response_metadata?: { next_cursor?: string };
}

export function normalizeEmoji(emoji: string) {
  return emoji.replace(COLON_REGEX, "").trim().toLowerCase();
}

export function getStampEmojiSet() {
  return new Set(
    TRACKED_STAMP_EMOJIS.map((emoji) => normalizeEmoji(emoji)).filter(Boolean)
  );
}

function toNormalizedUrl(candidate: string) {
  const cleaned = candidate.replace(/[)>.,!?]+$/g, "").split("|", 1)[0] ?? "";
  try {
    return new URL(cleaned);
  } catch {
    return null;
  }
}

function isQualifyingReviewHost(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === "github.com" ||
    host.endsWith(".github.com") ||
    host === "graphite.dev" ||
    host.endsWith(".graphite.dev")
  );
}

export function extractQualifyingReviewUrl(text: string | undefined) {
  if (!text) {
    return undefined;
  }
  const matches = text.match(URL_GLOBAL_REGEX) ?? [];
  for (const candidate of matches) {
    const parsed = toNormalizedUrl(candidate);
    if (parsed && isQualifyingReviewHost(parsed.hostname)) {
      return parsed.toString();
    }
  }
  return undefined;
}

function pickDisplayName(
  user: SlackUserInfoResponse["user"],
  fallbackId: string
) {
  const profile = user?.profile;
  return (
    profile?.display_name_normalized ||
    profile?.display_name ||
    profile?.real_name_normalized ||
    profile?.real_name ||
    user?.real_name ||
    user?.name ||
    fallbackId
  );
}

function pickImageUrl(profile: SlackUserProfile | undefined) {
  return (
    profile?.image_72 ||
    profile?.image_48 ||
    profile?.image_192 ||
    profile?.image_32 ||
    profile?.image_24
  );
}

export async function fetchSlackUserSummary(args: {
  botToken: string;
  slackUserId: string;
}): Promise<SlackUserSummary> {
  const params = new URLSearchParams({ user: args.slackUserId });
  const response = await fetch(
    `https://slack.com/api/users.info?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${args.botToken}` },
    }
  );
  const body = (await response.json()) as SlackUserInfoResponse;
  if (!(response.ok && body.ok && body.user)) {
    console.log("stamphog users.info lookup failed", {
      slackUserId: args.slackUserId,
      httpOk: response.ok,
      slackOk: body.ok ?? false,
      slackError: body.error ?? "unknown_error",
    });
    return {
      slackUserId: args.slackUserId,
      displayName: args.slackUserId,
    };
  }

  return {
    slackUserId: body.user.id ?? args.slackUserId,
    displayName: pickDisplayName(body.user, args.slackUserId),
    imageUrl: pickImageUrl(body.user.profile),
  };
}

export async function fetchSlackMessageAtTimestamp(args: {
  botToken: string;
  channelId: string;
  messageTs: string;
}) {
  const params = new URLSearchParams({
    channel: args.channelId,
    latest: args.messageTs,
    inclusive: "true",
    limit: "1",
  });
  const response = await fetch(
    `https://slack.com/api/conversations.history?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${args.botToken}` },
    }
  );
  const body = (await response.json()) as SlackHistoryResponse;
  if (!(response.ok && body.ok)) {
    return null;
  }
  return body.messages?.[0];
}

export async function fetchSlackHistoryPage(args: {
  botToken: string;
  channelId: string;
  cursor?: string;
  oldestTs?: string;
}) {
  const params = new URLSearchParams({
    channel: args.channelId,
    limit: "200",
    inclusive: "true",
  });
  if (args.cursor) {
    params.set("cursor", args.cursor);
  }
  if (args.oldestTs) {
    params.set("oldest", args.oldestTs);
  }

  const response = await fetch(
    `https://slack.com/api/conversations.history?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${args.botToken}` },
    }
  );
  const body = (await response.json()) as SlackHistoryResponse;
  return {
    ok: Boolean(response.ok && body.ok),
    error: body.error,
    messages: body.messages ?? [],
    nextCursor: body.response_metadata?.next_cursor ?? "",
  };
}

async function fetchSlackThreadPage(args: {
  botToken: string;
  channelId: string;
  threadTs: string;
  cursor?: string;
}) {
  const params = new URLSearchParams({
    channel: args.channelId,
    ts: args.threadTs,
    limit: "200",
    inclusive: "true",
  });
  if (args.cursor) {
    params.set("cursor", args.cursor);
  }

  const response = await fetch(
    `https://slack.com/api/conversations.replies?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${args.botToken}` },
    }
  );
  const body = (await response.json()) as SlackHistoryResponse;
  return {
    ok: Boolean(response.ok && body.ok),
    error: body.error,
    messages: body.messages ?? [],
    nextCursor: body.response_metadata?.next_cursor ?? "",
  };
}

export async function findQualifyingReviewUrlWithThreadFallback(args: {
  botToken: string;
  channelId: string;
  messageTs: string;
  messageText?: string;
  includeThreadFallback?: boolean;
}) {
  const directUrl = extractQualifyingReviewUrl(args.messageText);
  if (directUrl) {
    return directUrl;
  }
  if (!args.includeThreadFallback) {
    return undefined;
  }

  let cursor: string | undefined;
  while (true) {
    const page = await fetchSlackThreadPage({
      botToken: args.botToken,
      channelId: args.channelId,
      threadTs: args.messageTs,
      cursor,
    });

    if (!page.ok || page.messages.length === 0) {
      return undefined;
    }

    for (const threadMessage of page.messages) {
      const url = extractQualifyingReviewUrl(threadMessage.text);
      if (url) {
        return url;
      }
    }

    if (!page.nextCursor) {
      return undefined;
    }
    cursor = page.nextCursor;
  }
}

export function buildReactionDedupeKey(args: {
  channelId: string;
  messageTs: string;
  reaction: string;
  giverSlackId: string;
}) {
  return `slack:reaction:${args.channelId}:${args.messageTs}:${args.reaction}:${args.giverSlackId}`;
}

export function buildRequestDedupeKey(args: {
  channelId: string;
  messageTs: string;
}) {
  return `slack:request:${args.channelId}:${args.messageTs}`;
}
