export type Lang = 'vi' | 'en';
export type ThemeName = 'light' | 'dark' | 'outdoor';

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
