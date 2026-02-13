import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../../convex/_generated/api";

export const leaderboardQuery = convexQuery(api.stamps.leaderboard, {
  windowDays: 30,
  limit: 25,
});

export const recentStampEventsQuery = convexQuery(api.stamps.recentEvents, {
  limit: 20,
});

export function useLeaderboard() {
  return useSuspenseQuery(leaderboardQuery);
}

export function useRecentStampEvents() {
  return useSuspenseQuery(recentStampEventsQuery);
}
