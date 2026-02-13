export interface SlackEventEnvelope {
  type?: string;
  challenge?: string;
  event?: SlackEvent;
}

interface SlackBaseEvent {
  type?: string;
  event_ts?: string;
}

export type SlackMessageEvent = SlackBaseEvent & {
  type: "message";
  subtype?: string;
  user?: string;
  channel?: string;
  ts?: string;
  thread_ts?: string;
  reply_count?: number;
  text?: string;
};

export type SlackReactionEvent = SlackBaseEvent & {
  type: "reaction_added" | "reaction_removed";
  user?: string;
  reaction?: string;
  item?: {
    channel?: string;
    ts?: string;
  };
};

export type SlackEvent =
  | SlackMessageEvent
  | SlackReactionEvent
  | SlackBaseEvent;
