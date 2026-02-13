export interface LeaderboardRow {
  actorId: string;
  displayName: string;
  imageUrl?: string;
  stampsGiven?: number;
  stampsRequested?: number;
}

export function toLeaderboardRows<T extends LeaderboardRow>(rows: T[]) {
  return rows;
}
