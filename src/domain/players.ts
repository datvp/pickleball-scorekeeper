import { createTournament } from './tournaments';
import type { MatchType, PlayerIds, PlayerProfile, SavedMatch, TeamIndex, Tournament } from './types';

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

export const DEMO_PLAYER_NAMES = [
  'An', 'Bình', 'Cường', 'Duy', 'Em', 'Phúc', 'Giang', 'Hân', 'Khoa', 'Linh',
  'Minh', 'Nam', 'Oanh', 'Phương', 'Quân', 'Rin', 'Sơn', 'Tiến', 'Uyên', 'Vinh',
] as const;

export function createPlayerProfile(displayName: string, now = Date.now()): PlayerProfile {
  const name = displayName.trim();
  return {
    id: crypto.randomUUID(),
    displayName: name,
    level: '3.0',
    visibility: 'private',
    formerNames: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createDemoPlayers(now = Date.now()): PlayerProfile[] {
  return DEMO_PLAYER_NAMES.map((displayName, index) => ({
    id: crypto.randomUUID(),
    displayName,
    level: '3.0',
    visibility: 'private',
    formerNames: [],
    createdAt: now + index,
    updatedAt: now + index,
  }));
}

export function createDemoTournamentState(now = Date.now()): {
  players: PlayerProfile[];
  tournaments: Tournament[];
} {
  const players = createDemoPlayers(now);
  const tournament = createTournament(
    {
      name: 'Demo Club Championship',
      format: 'se',
      config: { type: 's', mode: 'trad', fmt: 'b3', target: 11, winBy: 2 },
      courts: 2,
      entries: players.map((player) => ({
        id: crypto.randomUUID(),
        playerIds: [player.id],
        names: [player.displayName],
      })),
    },
    now,
    () => crypto.randomUUID(),
  );

  return { players, tournaments: [tournament] };
}

export function migrateLegacyPlayers(history: SavedMatch[], now = Date.now()): PlayerProfile[] {
  return aggregatePlayers(history).map((player) => createPlayerProfile(player.name, now));
}

export function playerIdsForNames(
  players: PlayerProfile[],
  names: [string[], string[]],
): PlayerIds {
  return names.map((team) =>
    team.map((name) => {
      const normalized = name.trim().toLowerCase();
      const profile = players.find((player) =>
        [player.displayName, ...player.formerNames].some(
          (candidate) => candidate.toLowerCase() === normalized,
        ),
      );
      return profile?.id ?? null;
    }),
  ) as PlayerIds;
}

export function prepareMatchPlayers(
  players: PlayerProfile[],
  type: MatchType,
  inputNames: string[],
  now = Date.now(),
): { players: PlayerProfile[]; playerIds: PlayerIds } {
  const updatedPlayers = [...players];
  const playerIds: PlayerIds = [[], []];
  for (const slot of slotsFor(type)) {
    const name = inputNames[slot]?.trim() ?? '';
    const team = slot < 2 ? 0 : 1;
    const position = type === 's' ? 0 : slot % 2;
    if (!name) {
      playerIds[team][position] = null;
      continue;
    }

    let profile = updatedPlayers.find((player) =>
      [player.displayName, ...player.formerNames].some(
        (candidate) => candidate.toLowerCase() === name.toLowerCase(),
      ),
    );
    if (!profile) {
      profile = createPlayerProfile(name, now);
      updatedPlayers.push(profile);
    }
    playerIds[team][position] = profile.id;
  }
  return { players: updatedPlayers, playerIds };
}

export function isDuplicatePlayerName(
  players: PlayerProfile[],
  displayName: string,
  ignoreId?: string,
): boolean {
  const name = displayName.trim().toLowerCase();
  if (!name) return false;
  return players.some(
    (player) =>
      player.id !== ignoreId &&
      [player.displayName, ...player.formerNames].some(
        (candidate) => candidate.toLowerCase() === name,
      ),
  );
}

export function playerStats(history: SavedMatch[], player: PlayerProfile): PlayerRecord {
  const names = new Set(
    [player.displayName, ...player.formerNames].map((name) => name.toLowerCase()),
  );
  const result = { name: player.displayName, matches: 0, wins: 0 };
  for (const match of history) {
    const team = ([0, 1] as TeamIndex[]).find(
      (index) =>
        match.playerIds?.[index].includes(player.id) ||
        (!match.playerIds?.[index].includes(player.id) &&
          match.names[index].some((name) => names.has(name.toLowerCase()))),
    );
    if (team === undefined) continue;
    result.matches += 1;
    if (match.winner === team) result.wins += 1;
  }
  return result;
}

export function isPlayerInMatch(
  player: PlayerProfile,
  names: [string[], string[]],
  playerIds?: PlayerIds,
): boolean {
  const aliases = new Set(
    [player.displayName, ...player.formerNames].map((name) => name.toLowerCase()),
  );
  return ([0, 1] as TeamIndex[]).some(
    (team) =>
      playerIds?.[team].includes(player.id) ||
      (!playerIds?.[team].includes(player.id) &&
        names[team].some((name) => aliases.has(name.toLowerCase()))),
  );
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
