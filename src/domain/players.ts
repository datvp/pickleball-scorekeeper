import type { MatchType, SavedMatch, TeamIndex } from './types';

/** Name slots: 0,1 = team A; 2,3 = team B. Singles uses slots 0 and 2. */
export const slotsFor = (type: MatchType): number[] => (type === 'd' ? [0, 1, 2, 3] : [0, 2]);

export const SLOT_LABELS = ['A1', 'A2', 'B1', 'B2'] as const;

export const defaultLabel = (playerWord: string, slot: number) =>
  `${playerWord} ${SLOT_LABELS[slot]}`;

export function resolveName(names: string[], slot: number, playerWord: string): string {
  return (names[slot] ?? '').trim() || defaultLabel(playerWord, slot);
}

export function resolveTeams(
  type: MatchType,
  names: string[],
  playerWord: string,
): [string[], string[]] {
  const n = (i: number) => resolveName(names, i, playerWord);
  return type === 'd' ? [[n(0), n(1)], [n(2), n(3)]] : [[n(0)], [n(2)]];
}

/** True when two active slots were given the same (typed) name. Blank names are ignored. */
export function hasDuplicateNames(type: MatchType, names: string[]): boolean {
  const typed = slotsFor(type)
    .map((i) => (names[i] ?? '').trim().toLowerCase())
    .filter(Boolean);
  return new Set(typed).size !== typed.length;
}

export interface PlayerRecord {
  name: string;
  matches: number;
  wins: number;
}

export function aggregatePlayers(history: SavedMatch[]): PlayerRecord[] {
  const byName = new Map<string, PlayerRecord>();
  for (const m of history) {
    ([0, 1] as TeamIndex[]).forEach((team) => {
      for (const name of m.names[team]) {
        const rec = byName.get(name) ?? { name, matches: 0, wins: 0 };
        rec.matches += 1;
        if (m.winner === team) rec.wins += 1;
        byName.set(name, rec);
      }
    });
  }
  return [...byName.values()].sort((a, b) => b.wins - a.wins);
}

export const winRate = (r: PlayerRecord) => Math.round((100 * r.wins) / r.matches);
