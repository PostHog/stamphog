import { useRecentStampEvents } from "../queries";
import { Avatar } from "./avatar";

function formatDate(timestampMs: number) {
  return new Date(timestampMs).toLocaleString();
}

export function RecentEventsList() {
  const { data: events } = useRecentStampEvents();

  if (events.length === 0) {
    return <p className="text-sm text-zinc-500">No stamp activity yet.</p>;
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div
          className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2"
          key={event._id}
        >
          <div className="flex items-center gap-2">
            <Avatar
              fallback={event.giverDisplayName}
              imageUrl={event.giverImageUrl}
            />
            <p className="text-sm text-zinc-200">
              <span className="font-medium">{event.giverDisplayName}</span>{" "}
              stamped{" "}
              <span className="font-medium">{event.requesterDisplayName}</span>{" "}
              (+
              {event.stampCount})
            </p>
          </div>
          <p className="text-xs text-zinc-500">
            {formatDate(event.occurredAt)}
            {event.prUrl ? `  |  ${event.prUrl}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}
