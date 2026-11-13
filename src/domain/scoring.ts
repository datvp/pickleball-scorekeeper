import type {
  Match,
  MatchConfig,
  MatchSnapshot,
  SavedMatch,
  Score,
  TeamIndex,
} from './types';

export const isDoubles = (c: MatchConfig) => c.type === 'd';
export const gamesToWin = (c: MatchConfig) => (c.fmt === 'b3' ? 2 : 1);
/** Traditional doubles uses a server number (1 or 2); the first service of a game starts at 2. */
export const usesServerNumber = (c: MatchConfig) => isDoubles(c) && c.mode === 'trad';
const initialServerNumber = (c: MatchConfig): 1 | 2 => (usesServerNumber(c) ? 2 : 1);

export function createMatch(
  cfg: MatchConfig,
  names: [string[], string[]],
  firstServer: TeamIndex,
  now: number = Date.now(),
): Match {
  return {
    cfg: { ...cfg },
    names,
    sc: [0, 0],
    sv: firstServer,
    sn: initialServerNumber(cfg),
    gw: [0, 0],
    gn: 1,
    games: [],
    status: 'active',
    so: false,
    paused: false,
    start: now,
    s0: firstServer,
    stack: [],
  };
}

function snapshot(m: Match): MatchSnapshot {
  return {
    sc: [...m.sc],
    sv: m.sv,
    sn: m.sn,
    gw: [...m.gw],
    gn: m.gn,
    games: m.games.map((g) => [...g] as Score),
    status: m.status,
    so: m.so,
    winner: m.winner,
    end: m.end,
  };
}

/** Record a rally won by team `w`. Returns the same object if scoring is not allowed right now. */
export function applyRally(m: Match, w: TeamIndex, now: number = Date.now()): Match {
  if (m.status !== 'active' || m.paused) return m;
  const c = m.cfg;
  const next: Match = {
    ...m,
    sc: [...m.sc],
    gw: [...m.gw],
    games: [...m.games],
    stack: [...m.stack, snapshot(m)],
    so: false,
  };

  if (c.mode === 'rally') {
    // Rally scoring: the rally winner always scores; a winning receiver takes serve.
    next.sc[w] += 1;
    if (w !== m.sv) {
      next.sv = w;
      next.so = true;
    }
  } else if (w === m.sv) {
    next.sc[w] += 1;
  } else if (isDoubles(c) && m.sn === 1) {
    next.sn = 2;
  } else {
    next.sv = w;
    next.sn = 1;
    next.so = true;
  }

  const [a, b] = next.sc;
  if (Math.max(a, b) >= c.target && Math.abs(a - b) >= c.winBy) {
    const x: TeamIndex = a > b ? 0 : 1;
    next.gw[x] += 1;
    next.games.push([a, b]);
    if (next.gw[x] >= gamesToWin(c)) {
      next.status = 'done';
      next.winner = x;
      next.end = now;
    } else {
      next.status = 'gameover';
    }
  }
  return next;
}

export function undo(m: Match): Match {
  const last = m.stack[m.stack.length - 1];
  if (!last) return m;
  return {
    ...m,
    ...last,
    // Optional fields must be cleared explicitly when absent in the snapshot.
    winner: last.winner,
    end: last.end,
    stack: m.stack.slice(0, -1),
  };
}

export function nextGame(m: Match): Match {
  const gn = m.gn + 1;
  return {
    ...m,
    stack: [...m.stack, snapshot(m)],
    gn,
    sc: [0, 0],
    sv: ((m.s0 + gn - 1) % 2) as TeamIndex,
    sn: initialServerNumber(m.cfg),
    status: 'active',
    so: false,
  };
}

/** Would a rally won by team `k` end the current game? (drives Game/Match point badges) */
export function canEndGame(m: Match, k: TeamIndex): boolean {
  const c = m.cfg;
  const n = m.sc[k] + 1;
  const o = m.sc[1 - k];
  return n >= c.target && n - o >= c.winBy && (c.mode === 'rally' || m.sv === k);
}

export function isMatchPoint(m: Match, k: TeamIndex): boolean {
  return m.status === 'active' && canEndGame(m, k) && m.gw[k] + 1 >= gamesToWin(m.cfg);
}

export function isGamePoint(m: Match, k: TeamIndex): boolean {
  return m.status === 'active' && canEndGame(m, k);
}

/** "server score – receiver score [– server number]" as called aloud. */
export function scoreCall(m: Match): string {
  const base = `${m.sc[m.sv]}–${m.sc[1 - m.sv]}`;
  return usesServerNumber(m.cfg) ? `${base}–${m.sn}` : base;
}

export const teamName = (m: Pick<Match, 'names'>, k: TeamIndex) => m.names[k].join(' / ');

export function matchMinutes(m: { start: number; end?: number }, now: number = Date.now()): number {
  return Math.max(1, Math.round(((m.end ?? now) - m.start) / 60000));
}

export function matchSummary(m: Pick<Match, 'names' | 'gw' | 'games'>): string {
  return `${teamName(m, 0)} ${m.gw[0]}–${m.gw[1]} ${teamName(m, 1)} (${m.games
    .map((g) => g.join('–'))
    .join(', ')})`;
}

/** Convert a finished match into its stored history form. */
export function toSavedMatch(m: Match): SavedMatch | null {
  if (m.status !== 'done' || m.winner === undefined || m.end === undefined) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { stack, paused, ...rest } = m;
  return { ...rest, id: m.start, end: m.end, winner: m.winner };
}
