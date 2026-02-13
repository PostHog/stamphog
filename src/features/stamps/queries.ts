import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../../convex/_generated/api";

const DEFAULT_LEADERBOARD_WINDOW_DAYS = 30;
const LEADERBOARD_LIMIT = 25;

export function leaderboardQuery(windowDays = DEFAULT_LEADERBOARD_WINDOW_DAYS) {
  return convexQuery(api.stamps.leaderboard, {
    windowDays,
    limit: LEADERBOARD_LIMIT,
  });
}

export const recentStampEventsQuery = convexQuery(api.stamps.recentEvents, {
  limit: 20,
});

export function useLeaderboard(windowDays = DEFAULT_LEADERBOARD_WINDOW_DAYS) {
  return useSuspenseQuery(leaderboardQuery(windowDays));
}

export function useRecentStampEvents() {
  return useSuspenseQuery(recentStampEventsQuery);
}
