import { usePostHog } from "posthog-js/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useRecentStampEvents } from "../queries";
import { Avatar } from "./avatar";

const GITHUB_PR_URL = /github\.com\/[^/]+\/([^/]+)\/pull\/(\d+)/;
const WHITESPACE = /\s/;

function timeAgo(ms: number): string {
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) {
    return "now";
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return `${min}m`;
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    return `${hr}h`;
  }
  const d = Math.floor(hr / 24);
  if (d < 7) {
    return `${d}d`;
  }
  return `${Math.floor(d / 7)}w`;
}

function prLabel(url: string): string {
  const gh = url.match(GITHUB_PR_URL);
  if (gh) {
    return `${gh[1]}#${gh[2]}`;
  }
  return "PR";
}

function firstName(name: string): string {
  return name.split(WHITESPACE)[0] ?? name;
}

export function RecentEventsList() {
  const posthog = usePostHog();
  const { data: events } = useRecentStampEvents();

  if (events.length === 0) {
    return (
      <p className="py-10 text-center text-muted-foreground text-sm">
        No activity yet
      </p>
    );
  }

  const handlePrLinkClick = (prUrl: string, eventType: "stamp" | "request") => {
    const gh = prUrl.match(GITHUB_PR_URL);
    posthog.capture("pr_link_clicked", {
      pr_url: prUrl,
      event_type: eventType,
      repo: gh?.[1],
      pr_number: gh?.[2] ? Number(gh[2]) : undefined,
    });
  };

  return (
    <div className="space-y-0.5">
      {events.map((ev, i) => {
        const prUrl = ev.prUrl;
        return (
          <div
            className="flex animate-fade-up items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-accent/40"
            key={ev._id}
            style={{ animationDelay: `${i * 25}ms` }}
          >
            {ev.type === "stamp" ? (
              <StampEvent ev={ev} />
            ) : (
              <RequestEvent ev={ev} />
            )}
            <div className="flex shrink-0 items-center gap-2.5">
              {prUrl && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      className="font-mono text-[11px] text-muted-foreground/70 transition-colors hover:text-muted-foreground"
                      href={prUrl}
                      onClick={() => handlePrLinkClick(prUrl, ev.type)}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {prLabel(prUrl)}
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>{prUrl}</TooltipContent>
                </Tooltip>
              )}
              <span className="font-mono text-[11px] text-muted-foreground/50 tabular-nums">
                {timeAgo(ev.occurredAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StampEvent({
  ev,
}: {
  ev: {
    giverDisplayName: string;
    giverImageUrl?: string;
    requesterDisplayName: string;
    requesterImageUrl?: string;
  };
}) {
  return (
    <>
      <Avatar fallback={ev.giverDisplayName} imageUrl={ev.giverImageUrl} />
      <svg
        aria-hidden="true"
        className="h-3 w-3 shrink-0 text-muted-foreground/50"
        fill="none"
        viewBox="0 0 12 12"
      >
        <path
          d="M2 6h8m-3-3 3 3-3 3"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
      <Avatar
        fallback={ev.requesterDisplayName}
        imageUrl={ev.requesterImageUrl}
      />
      <p className="min-w-0 flex-1 truncate text-muted-foreground text-sm">
        <span className="text-secondary-foreground">
          {firstName(ev.giverDisplayName)}
        </span>
        {" stamped "}
        <span className="text-secondary-foreground">
          {firstName(ev.requesterDisplayName)}
        </span>
      </p>
    </>
  );
}

function RequestEvent({
  ev,
}: {
  ev: { requesterDisplayName: string; requesterImageUrl?: string };
}) {
  return (
    <>
      <Avatar
        fallback={ev.requesterDisplayName}
        imageUrl={ev.requesterImageUrl}
      />
      <p className="min-w-0 flex-1 truncate text-muted-foreground text-sm">
        <span className="text-secondary-foreground">
          {firstName(ev.requesterDisplayName)}
        </span>
        {" requested a stamp"}
      </p>
    </>
  );
}
