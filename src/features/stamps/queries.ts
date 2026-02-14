import { convexQuery } from "@convex-dev/react-query";
import {
  keepPreviousData,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { api } from "../../../convex/_generated/api";

const DEFAULT_LEADERBOARD_WINDOW_DAYS = 30;

export function leaderboardQuery(windowDays = DEFAULT_LEADERBOARD_WINDOW_DAYS) {
  return convexQuery(api.stamps.leaderboard, { windowDays });
}

export function ttsLeaderboardQuery(windowDays = DEFAULT_LEADERBOARD_WINDOW_DAYS) {
  return convexQuery(api.stamps.ttsLeaderboard, { windowDays });
}

export const recentStampEventsQuery = convexQuery(api.stamps.recentEvents, {});

export function useLeaderboard(windowDays = DEFAULT_LEADERBOARD_WINDOW_DAYS) {
  return useQuery({
    ...leaderboardQuery(windowDays),
    placeholderData: keepPreviousData,
  });
}

export function useTtsLeaderboard(windowDays = DEFAULT_LEADERBOARD_WINDOW_DAYS) {
  return useQuery({
    ...ttsLeaderboardQuery(windowDays),
    placeholderData: keepPreviousData,
  });
}

export function useRecentStampEvents() {
  return useSuspenseQuery(recentStampEventsQuery);
}
