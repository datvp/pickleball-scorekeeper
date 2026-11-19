import { describe, expect, it } from 'vitest';
import {
  createTournament,
  generateRoundRobinFixtures,
  generateSingleEliminationFixtures,
  roundRobinStandings,
  saveTournamentResult,
  singleEliminationResults,
  validateTournamentSetup,
} from './tournaments';
import type { TournamentEntry } from './types';

const entries = (count: number): TournamentEntry[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `entry-${index + 1}`,
    playerIds: [`player-${index + 1}`],
    names: [`Player ${index + 1}`],
  }));
const ids = (count: number) => entries(count).map((entry) => entry.id);
const nextId = (() => {
  let value = 0;
  return () => `generated-${++value}`;
})();

describe('tournament fixtures', () => {
  it('generates every Round Robin pairing once and assigns one bye per odd round', () => {
    const fixtures = generateRoundRobinFixtures(ids(5), 2, nextId);
    const played = fixtures.filter((item) => !item.bye);
    const pairings = played.map((item) => item.participantIds.slice().sort().join(':'));

    expect(fixtures).toHaveLength(15);
    expect(played).toHaveLength(10);
    expect(new Set(pairings).size).toBe(10);
    expect(new Set(fixtures.filter((item) => item.bye).map((item) => item.round))).toHaveLength(5);
    expect(
      fixtures
        .filter((item) => item.bye)
        .map((item) => item.participantIds[0])
        .sort(),
    ).toEqual(ids(5).sort());
    for (let round = 1; round <= 5; round += 1) {
      expect(fixtures.filter((item) => item.round === round && item.bye)).toHaveLength(1);
    }
  });

  it('builds a power-of-two elimination bracket and advances byes and winners', () => {
    const fixtures = generateSingleEliminationFixtures(ids(5), 2, nextId);
    const byes = fixtures.filter((item) => item.bye);

    expect(fixtures.filter((item) => item.round === 1)).toHaveLength(4);
    expect(fixtures).toHaveLength(7);
    expect(byes).toHaveLength(3);
    expect(fixtures.find((item) => item.round === 2 && item.position === 0)?.participantIds[0]).toBe(
      'entry-1',
    );

    const tournament = createTournament(
      {
        name: 'Club Cup',
        format: 'se',
        config: { type: 's', mode: 'rally', fmt: 's', target: 11, winBy: 2 },
        courts: 2,
        entries: entries(3),
      },
      100,
      nextId,
    );
    const firstPlayed = tournament.fixtures.find((item) => item.round === 1 && !item.bye)!;
    const afterResult = saveTournamentResult(
      tournament,
      firstPlayed.id,
      { savedMatchId: 99, games: [[11, 4]], winner: 0, completedAt: 200 },
      200,
    );
    const final = afterResult.fixtures.find((item) => item.round === 2)!;
    expect(final.participantIds).toEqual([
      tournament.entries[0].id,
      firstPlayed.participantIds[0],
    ]);
    const finished = saveTournamentResult(
      afterResult,
      final.id,
      { savedMatchId: 100, games: [[11, 5]], winner: 1, completedAt: 300 },
      300,
    );
    expect(finished.status).toBe('completed');
    expect(singleEliminationResults(finished)).toMatchObject({
      champion: final.participantIds[1],
      runnerUp: final.participantIds[0],
    });
  });
});

describe('Round Robin standings', () => {
  it('uses head-to-head for a two-way tie and shared ranks for unresolved ties', () => {
    const tournament = createTournament(
      {
        name: 'Club Cup',
        format: 'rr',
        config: { type: 's', mode: 'rally', fmt: 's', target: 11, winBy: 2 },
        courts: 2,
        entries: entries(4),
      },
      100,
      nextId,
    );
    let updated = tournament;
    const [first, second, third, fourth] = tournament.entries.map((entry) => entry.id);
    const score = (firstId: string, secondId: string, winnerId: string, savedMatchId: number) => {
      const fixture = updated.fixtures.find(
        (item) =>
          item.participantIds.includes(firstId) && item.participantIds.includes(secondId),
      )!;
      const winner: 0 | 1 = fixture.participantIds[0] === winnerId ? 0 : 1;
      const games: [[number, number]] = [winner === 0 ? [11, 0] : [0, 11]];
      updated = saveTournamentResult(
        updated,
        fixture.id,
        { savedMatchId, games, winner, completedAt: savedMatchId },
      );
    };

    score(first, second, first, 1);
    score(first, third, first, 2);
    score(first, fourth, fourth, 3);
    score(second, third, second, 4);
    score(second, fourth, second, 5);
    score(third, fourth, third, 6);
    const standings = roundRobinStandings(updated);

    expect(updated.status).toBe('completed');
    expect(standings.map((item) => [item.entryId, item.rank])).toEqual([
      [first, 1],
      [second, 2],
      [third, 3],
      [fourth, 4],
    ]);
    const savedFixture = updated.fixtures.find((item) => item.result)!;
    expect(saveTournamentResult(updated, savedFixture.id, savedFixture.result!)).toBe(updated);

    const tied = createTournament(
      {
        name: 'Tied Cup',
        format: 'rr',
        config: { type: 's', mode: 'rally', fmt: 's', target: 11, winBy: 2 },
        courts: 2,
        entries: entries(3),
      },
      100,
      nextId,
    );
    const noResults = roundRobinStandings(tied);
    expect(noResults.every((item) => item.rank === 1)).toBe(true);
  });

  it('accepts distinct doubles pairs and rejects a player entered on multiple teams', () => {
    const setup = {
      name: 'Doubles Cup',
      format: 'rr' as const,
      config: { type: 'd' as const, mode: 'trad' as const, fmt: 's' as const, target: 11 as const, winBy: 2 as const },
      courts: 2,
      entries: Array.from({ length: 3 }, (_, index) => ({
        id: `team-${index + 1}`,
        playerIds: [`player-${index * 2 + 1}`, `player-${index * 2 + 2}`],
        names: [`Player ${index * 2 + 1}`, `Player ${index * 2 + 2}`],
      })),
    };

    expect(validateTournamentSetup(setup)).toBeNull();
    expect(
      validateTournamentSetup({
        ...setup,
        entries: setup.entries.map((entry, index) =>
          index === 1 ? { ...entry, playerIds: ['player-1', 'player-4'] } : entry,
        ),
      }),
    ).toBe('duplicatePlayer');
    expect(createTournament(setup).entries.every((entry) => entry.playerIds.length === 2)).toBe(true);
  });
});
