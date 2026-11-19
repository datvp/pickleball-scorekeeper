import { describe, expect, it } from 'vitest';
import { applyRally, createMatch, toSavedMatch } from './scoring';
import { createDemoPlayers, createDemoTournamentState, isPlayerInMatch, playerStats, prepareMatchPlayers } from './players';
import type { PlayerProfile } from './types';

describe('player identity', () => {
  it('creates stable profile IDs for typed singles and doubles names only', () => {
    const singles = prepareMatchPlayers([], 's', ['An', '', 'Binh'], 10);
    expect(singles.players.map((player) => player.displayName)).toEqual(['An', 'Binh']);
    expect(singles.playerIds).toEqual([
      [singles.players[0].id],
      [singles.players[1].id],
    ]);

    const doubles = prepareMatchPlayers([], 'd', ['An', 'Binh', 'Chi', 'Dung'], 10);
    expect(doubles.playerIds).toEqual([
      [doubles.players[0].id, doubles.players[1].id],
      [doubles.players[2].id, doubles.players[3].id],
    ]);
  });

  it('creates a 20-player demo set and a demo tournament ready to play', () => {
    const players = createDemoPlayers(10);
    const demo = createDemoTournamentState(10);

    expect(players).toHaveLength(20);
    expect(demo.players).toHaveLength(20);
    expect(demo.tournaments).toHaveLength(1);
    expect(demo.tournaments[0].entries).toHaveLength(20);
    expect(demo.tournaments[0].fixtures.length).toBeGreaterThan(0);
    expect(demo.tournaments[0].name).toBe('Demo Club Championship');
  });

  it('reuses an existing profile and leaves default labels unlinked', () => {
    const profile: PlayerProfile = {
      id: 'player-an',
      displayName: 'An',
      level: '3.5',
      visibility: 'private',
      formerNames: [],
      createdAt: 0,
      updatedAt: 0,
    };
    const result = prepareMatchPlayers([profile], 'd', ['An', '', '', 'Binh'], 10);

    expect(result.players).toHaveLength(2);
    expect(result.playerIds).toEqual([[profile.id, null], [null, result.players[1].id]]);
  });

  it('uses stable player IDs for statistics after a display-name change', () => {
    const profile: PlayerProfile = {
      id: 'player-an',
      displayName: 'An Nguyen',
      level: '3.5',
      visibility: 'private',
      formerNames: ['An'],
      createdAt: 0,
      updatedAt: 1,
    };
    let match = createMatch(
      { type: 's', mode: 'rally', fmt: 's', target: 11, winBy: 2 },
      [['An'], ['Binh']],
      0,
      0,
      [[profile.id], ['player-binh']],
    );
    for (let point = 0; point < 11; point++) match = applyRally(match, 0, 60_000);
    const saved = toSavedMatch(match)!;

    expect(playerStats([saved], profile)).toMatchObject({ matches: 1, wins: 1 });
    expect(isPlayerInMatch(profile, saved.names, saved.playerIds)).toBe(true);
  });
});
