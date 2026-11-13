import { describe, expect, it } from 'vitest';
import {
  applyRally,
  canEndGame,
  createMatch,
  isMatchPoint,
  matchSummary,
  nextGame,
  scoreCall,
  toSavedMatch,
  undo,
} from './scoring';
import { aggregatePlayers, hasDuplicateNames, resolveTeams } from './players';
import type { Match, MatchConfig, TeamIndex } from './types';

const base: MatchConfig = { type: 'd', mode: 'trad', fmt: 's', target: 11, winBy: 2 };
const mk = (over: Partial<MatchConfig> = {}, first: TeamIndex = 0): Match =>
  createMatch({ ...base, ...over }, [['A1', 'A2'], ['B1', 'B2']], first, 0);
const rallies = (m: Match, ...ws: TeamIndex[]) => ws.reduce((acc, w) => applyRally(acc, w, 1000), m);

describe('traditional scoring', () => {
  it('starts doubles at server number 2 and singles at 1', () => {
    expect(mk().sn).toBe(2);
    expect(mk({ type: 's' }).sn).toBe(1);
  });

  it('only the serving team scores', () => {
    const m = rallies(mk(), 0, 0);
    expect(m.sc).toEqual([2, 0]);
  });

  it('first server of a doubles game loses the serve immediately (side out)', () => {
    const m = rallies(mk(), 1);
    expect(m.sv).toBe(1);
    expect(m.sn).toBe(1);
    expect(m.so).toBe(true);
    expect(m.sc).toEqual([0, 0]);
  });

  it('doubles: server 1 loses -> server 2, server 2 loses -> side out', () => {
    let m = rallies(mk(), 1); // side out to team B, server 1
    m = rallies(m, 0); // B server 1 loses -> server 2
    expect(m.sv).toBe(1);
    expect(m.sn).toBe(2);
    expect(m.so).toBe(false);
    m = rallies(m, 0); // B server 2 loses -> side out to A
    expect(m.sv).toBe(0);
    expect(m.sn).toBe(1);
    expect(m.so).toBe(true);
  });

  it('singles: any lost serve is a side out', () => {
    const m = rallies(mk({ type: 's' }), 1);
    expect(m.sv).toBe(1);
    expect(m.so).toBe(true);
  });

  it('score call includes server number only in traditional doubles', () => {
    expect(scoreCall(mk())).toBe('0–0–2');
    expect(scoreCall(mk({ type: 's' }))).toBe('0–0');
    expect(scoreCall(mk({ mode: 'rally' }))).toBe('0–0');
  });
});

describe('game and match end', () => {
  const score = (m: Match, team: TeamIndex, n: number) =>
    Array.from({ length: n }).reduce<Match>((acc) => applyRally(acc, team, 1000), m);

  it('ends a single game at the target with a 2 point lead', () => {
    const m = score(mk({ type: 's' }), 0, 11);
    expect(m.status).toBe('done');
    expect(m.winner).toBe(0);
    expect(m.games).toEqual([[11, 0]]);
    expect(m.end).toBe(1000);
  });

  it('requires win by 2 when configured', () => {
    // 10-10 then A scores: 11-10 is not enough.
    let m = mk({ type: 's', mode: 'rally' });
    for (let i = 0; i < 10; i++) m = rallies(m, 0, 1);
    expect(m.sc).toEqual([10, 10]);
    m = rallies(m, 0);
    expect(m.status).toBe('active');
    m = rallies(m, 0);
    expect(m.status).toBe('done');
    expect(m.games[0]).toEqual([12, 10]);
  });

  it('win by 1 ends at the target', () => {
    let m = mk({ type: 's', mode: 'rally', winBy: 1 });
    for (let i = 0; i < 10; i++) m = rallies(m, 0, 1);
    m = rallies(m, 1);
    expect(m.status).toBe('done');
    expect(m.winner).toBe(1);
  });

  it('best of 3: game over -> next game alternates first server', () => {
    let m = score(mk({ type: 's', fmt: 'b3' }), 0, 11);
    expect(m.status).toBe('gameover');
    expect(m.gw).toEqual([1, 0]);
    m = nextGame(m);
    expect(m.gn).toBe(2);
    expect(m.sc).toEqual([0, 0]);
    expect(m.sv).toBe(1); // team B serves game 2 when A served game 1
    expect(m.status).toBe('active');
    m = rallies(m, 1); // B serves and scores
    m = score(m, 1, 10);
    expect(m.status).toBe('gameover');
    m = nextGame(m);
    expect(m.sv).toBe(0); // game 3 back to team A
    m = score(m, 0, 11);
    expect(m.status).toBe('done');
    expect(m.winner).toBe(0);
    expect(m.gw).toEqual([2, 1]);
  });

  it('ignores rallies after the match is finished or while paused', () => {
    const done = score(mk({ type: 's' }), 0, 11);
    expect(applyRally(done, 0)).toBe(done);
    const paused = { ...mk(), paused: true };
    expect(applyRally(paused, 0)).toBe(paused);
  });
});

describe('game point / match point', () => {
  it('flags game point only for the team that can end the game', () => {
    let m = mk({ type: 's' });
    m = rallies(m, ...Array<TeamIndex>(10).fill(0));
    expect(canEndGame(m, 0)).toBe(true);
    expect(canEndGame(m, 1)).toBe(false);
    expect(isMatchPoint(m, 0)).toBe(true);
  });

  it('in traditional mode the receiving team cannot be on game point', () => {
    let m = mk({ type: 's', target: 11 });
    m = rallies(m, ...Array<TeamIndex>(10).fill(0)); // A serving at 10
    expect(canEndGame(m, 1)).toBe(false);
  });

  it('is not match point in best of 3 game 1', () => {
    let m = mk({ type: 's', fmt: 'b3' });
    m = rallies(m, ...Array<TeamIndex>(10).fill(0));
    expect(canEndGame(m, 0)).toBe(true);
    expect(isMatchPoint(m, 0)).toBe(false);
  });
});

describe('rally scoring', () => {
  it('rally winner scores and a winning receiver takes serve', () => {
    let m = mk({ mode: 'rally' });
    m = rallies(m, 1);
    expect(m.sc).toEqual([0, 1]);
    expect(m.sv).toBe(1);
    expect(m.so).toBe(true);
    m = rallies(m, 1);
    expect(m.sc).toEqual([0, 2]);
    expect(m.so).toBe(false);
  });
});

describe('undo', () => {
  it('restores the previous rally', () => {
    const m0 = mk();
    const m1 = rallies(m0, 0);
    const back = undo(m1);
    expect(back.sc).toEqual([0, 0]);
    expect(back.stack).toHaveLength(0);
  });

  it('can undo the winning rally and clears winner/end', () => {
    let m = mk({ type: 's' });
    m = rallies(m, ...Array<TeamIndex>(11).fill(0));
    expect(m.status).toBe('done');
    m = undo(m);
    expect(m.status).toBe('active');
    expect(m.winner).toBeUndefined();
    expect(m.end).toBeUndefined();
    expect(m.sc).toEqual([10, 0]);
    expect(m.gw).toEqual([0, 0]);
    expect(m.games).toEqual([]);
  });

  it('can undo across a game boundary', () => {
    let m = mk({ type: 's', fmt: 'b3' });
    m = rallies(m, ...Array<TeamIndex>(11).fill(0));
    m = nextGame(m);
    m = undo(m);
    expect(m.status).toBe('gameover');
    expect(m.gn).toBe(1);
    expect(m.gw).toEqual([1, 0]);
  });

  it('does nothing on an empty stack', () => {
    const m = mk();
    expect(undo(m)).toBe(m);
  });
});

describe('summary and history', () => {
  it('builds a share summary', () => {
    let m = mk({ type: 's', fmt: 'b3', mode: 'rally' });
    m = { ...m, names: [['An'], ['Binh']] };
    for (let i = 0; i < 11; i++) m = rallies(m, 0);
    m = nextGame(m);
    for (let i = 0; i < 11; i++) m = rallies(m, 0);
    expect(matchSummary(m)).toBe('An 2–0 Binh (11–0, 11–0)');
  });

  it('only finished matches can be saved', () => {
    expect(toSavedMatch(mk())).toBeNull();
    let m = mk({ type: 's' });
    m = rallies(m, ...Array<TeamIndex>(11).fill(0));
    const saved = toSavedMatch(m)!;
    expect(saved.id).toBe(m.start);
    expect(saved).not.toHaveProperty('stack');
  });

  it('aggregates player records', () => {
    let m = mk({ type: 's' });
    m = { ...m, names: [['An'], ['Binh']] };
    m = rallies(m, ...Array<TeamIndex>(11).fill(0));
    const rec = aggregatePlayers([toSavedMatch(m)!]);
    expect(rec).toEqual([
      { name: 'An', matches: 1, wins: 1 },
      { name: 'Binh', matches: 1, wins: 0 },
    ]);
  });
});

describe('player names', () => {
  it('falls back to default labels', () => {
    expect(resolveTeams('d', ['', ' ', '', ''], 'Người chơi')).toEqual([
      ['Người chơi A1', 'Người chơi A2'],
      ['Người chơi B1', 'Người chơi B2'],
    ]);
    expect(resolveTeams('s', ['An', '', 'Binh', ''], 'P')).toEqual([['An'], ['Binh']]);
  });

  it('detects duplicate typed names case-insensitively, ignoring blanks and inactive slots', () => {
    expect(hasDuplicateNames('d', ['An', 'an', '', ''])).toBe(true);
    expect(hasDuplicateNames('d', ['', '', '', ''])).toBe(false);
    // slot 1 is not used in singles
    expect(hasDuplicateNames('s', ['An', 'An', 'Binh', ''])).toBe(false);
  });
});
