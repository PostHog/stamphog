export interface LeaderboardRow {
  actorId: string;
  displayName: string;
  imageUrl?: string;
  stampsGiven?: number;
  stampsRequested?: number;
  medianTtsMs?: number;
  stampCount?: number;
}

export function toLeaderboardRows<T extends LeaderboardRow>(rows: T[]) {
  return rows;
}
