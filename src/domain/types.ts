export type Lang = 'vi' | 'en';
export type ThemeName = 'soft-sage' | 'blush' | 'linen' | 'taupe' | 'deep-sage';

export type TeamIndex = 0 | 1;
export type Score = [number, number];

export type MatchType = 's' | 'd'; // singles | doubles
export type ScoringMode = 'trad' | 'rally';
export type GameFormat = 's' | 'b3'; // single game | best of 3
export type TargetScore = 11 | 15 | 21;
export type WinBy = 1 | 2;

export interface MatchConfig {
  type: MatchType;
  mode: ScoringMode;
  fmt: GameFormat;
  target: TargetScore;
  winBy: WinBy;
}

export interface PlayerProfile {
  id: string;
  displayName: string;
  level: string;
  visibility: ProfileVisibility;
  formerNames: string[];
  createdAt: number;
  updatedAt: number;
}

export type ProfileVisibility = 'private' | 'tournament';

export type PlayerIds = [Array<string | null>, Array<string | null>];

export type TournamentFormat = 'rr' | 'se';
export type TournamentStatus = 'ready' | 'inProgress' | 'completed';

export interface TournamentEntry {
  id: string;
  playerIds: string[];
  names: string[];
}

export interface TournamentResult {
  savedMatchId: number;
  games: Score[];
  winner: TeamIndex;
  completedAt: number;
}

export interface TournamentFixture {
  id: string;
  round: number;
  position: number;
  participantIds: [string | null, string | null];
  court: number | null;
  bye: boolean;
  status: 'scheduled' | 'inProgress' | 'completed' | 'bye';
  result?: TournamentResult;
}

export interface Tournament {
  id: string;
  name: string;
  format: TournamentFormat;
  config: MatchConfig;
  courts: number;
  entries: TournamentEntry[];
  fixtures: TournamentFixture[];
  status: TournamentStatus;
  createdAt: number;
  updatedAt: number;
}

export type MatchStatus = 'active' | 'gameover' | 'done';

/** The part of a match that Undo restores. */
export interface MatchSnapshot {
  sc: Score;
  sv: TeamIndex;
  sn: 1 | 2;
  gw: Score;
  gn: number;
  games: Score[];
  status: MatchStatus;
  so: boolean;
  winner?: TeamIndex;
  end?: number;
}

export interface Match extends MatchSnapshot {
  cfg: MatchConfig;
  /** Display names per team: 1 name for singles, 2 for doubles. */
  names: [string[], string[]];
  /** Stable player identities aligned with `names`; null indicates a free-text/default label. */
  playerIds?: PlayerIds;
  /** Present only for a tournament fixture scored through the shared MVP engine. */
  tournamentRef?: { tournamentId: string; fixtureId: string };
  paused: boolean;
  start: number;
  /** Team that served first in game 1. */
  s0: TeamIndex;
  stack: MatchSnapshot[];
}

/** A finished match stored in history. */
export type SavedMatch = Omit<Match, 'stack' | 'paused' | 'end' | 'winner'> & {
  id: number;
  end: number;
  winner: TeamIndex;
};
