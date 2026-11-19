import { describe, expect, it } from 'vitest';
import { createInitialState, reducer, type Action, type AppState } from './reducer';
import { playerStats } from '../domain/players';
import { createTournament } from '../domain/tournaments';

const run = (s: AppState, ...actions: Action[]) => actions.reduce(reducer, s);

const singlesNames: [string[], string[]] = [['An'], ['Binh']];

function playSingles(extra: Partial<AppState['cfg']> = {}) {
  return run(
    createInitialState(),
    { type: 'QUICK_START' },
    { type: 'SET_CONFIG', patch: { type: 's', ...extra } },
    { type: 'START_MATCH', names: singlesNames, now: 0 },
  );
}

describe('app flow', () => {
  it('start -> play to the end -> result -> save -> history', () => {
    let s = playSingles();
    expect(s.view).toBe('live');
    for (let i = 0; i < 11; i++) s = reducer(s, { type: 'RALLY', team: 0, now: 60_000 });
    expect(s.view).toBe('result');
    expect(s.match?.winner).toBe(0);

    s = reducer(s, { type: 'SAVE_MATCH' });
    expect(s.view).toBe('history');
    expect(s.match).toBeNull();
    expect(s.history).toHaveLength(1);
    expect(s.history[0].names).toEqual(singlesNames);
  });

  it('does not save the same match twice', () => {
    let s = playSingles();
    for (let i = 0; i < 11; i++) s = reducer(s, { type: 'RALLY', team: 0 });
    const saved = reducer(s, { type: 'SAVE_MATCH' });
    const again = reducer({ ...saved, match: s.match }, { type: 'SAVE_MATCH' });
    expect(again.history).toHaveLength(1);
  });

  it('undo from the result screen returns to live', () => {
    let s = playSingles();
    for (let i = 0; i < 11; i++) s = reducer(s, { type: 'RALLY', team: 0 });
    s = reducer(s, { type: 'UNDO' });
    expect(s.view).toBe('live');
    expect(s.match?.status).toBe('active');
  });

  it('pause blocks scoring', () => {
    let s = reducer(playSingles(), { type: 'PAUSE' });
    s = reducer(s, { type: 'RALLY', team: 0 });
    expect(s.match?.sc).toEqual([0, 0]);
    s = run(s, { type: 'RESUME_PLAY' }, { type: 'RALLY', team: 0 });
    expect(s.match?.sc).toEqual([1, 0]);
  });

  it('end match discards progress and clear-all wipes history', () => {
    let s = playSingles();
    const player = {
      id: 'local-player-1',
      displayName: 'An',
      level: '3.0',
      visibility: 'private' as const,
      formerNames: [],
      createdAt: 0,
      updatedAt: 0,
    };
    s = reducer({ ...s, players: [player] }, { type: 'END_MATCH' });
    expect(s.players).toEqual([player]);
    expect(s.match).toBeNull();
    expect(s.view).toBe('home');
    s = {
      ...s,
      history: [{} as never],
      tournaments: [
        createTournament(
          {
            name: 'Clear Cup',
            format: 'rr',
            config: { type: 's', mode: 'trad', fmt: 's', target: 11, winBy: 2 },
            courts: 1,
            entries: ['A', 'B', 'C'].map((name, index) => ({
              id: `entry-${index}`,
              playerIds: [`player-${index}`],
              names: [name],
            })),
          },
          0,
        ),
      ],
    };
    s = reducer(s, { type: 'CLEAR_ALL' });
    expect(s.history).toEqual([]);
    expect(s.players).toEqual([]);
    expect(s.tournaments).toEqual([]);
    const reloaded = createInitialState({
      settings: s.settings,
      history: s.history,
      match: s.match,
      players: s.players,
      tournaments: s.tournaments,
    });
    expect(reloaded.players).toEqual([]);
    expect(reloaded.tournaments).toEqual([]);
  });

  it('toggles and settings', () => {
    let s = createInitialState();
    s = run(s, { type: 'TOGGLE', key: 'haptics' }, { type: 'SET_LANG', lang: 'en' }, { type: 'SET_THEME', theme: 'blush' });
    expect(s.settings).toMatchObject({ haptics: false, lang: 'en', theme: 'blush' });
  });

  it('uses the default theme for legacy or invalid persisted themes', () => {
    expect(createInitialState(JSON.parse('{"settings":{"theme":"dark"}}')).settings.theme).toBe('soft-sage');
    expect(createInitialState(JSON.parse('{"settings":{"theme":"unknown"}}')).settings.theme).toBe('soft-sage');
  });

  it('preserves a supported persisted theme', () => {
    expect(
      createInitialState({
        settings: { lang: 'vi', theme: 'deep-sage', keepAwake: true, haptics: true },
      }).settings.theme,
    ).toBe('deep-sage');
  });

  it('migrates legacy match names into stable local player profiles', () => {
    let s = playSingles();
    for (let i = 0; i < 11; i++) s = reducer(s, { type: 'RALLY', team: 0, now: 60_000 });
    s = reducer(s, { type: 'SAVE_MATCH' });
    const migrated = createInitialState({ history: s.history });

    expect(migrated.players.map((player) => player.displayName)).toEqual(['An', 'Binh']);
    expect(new Set(migrated.players.map((player) => player.id)).size).toBe(2);
    expect(migrated.players.every((player) => player.level === '3.0')).toBe(true);
    expect(migrated.players.every((player) => player.visibility === 'private')).toBe(true);
    expect(migrated.history[0].playerIds).toEqual([
      [migrated.players[0].id],
      [migrated.players[1].id],
    ]);
    const legacyPlayers = migrated.players.map(({ visibility: _visibility, ...player }) => player) as AppState['players'];
    expect(createInitialState({ players: legacyPlayers }).players[0].visibility).toBe('private');

    const updated = reducer(migrated, {
      type: 'UPDATE_PLAYER',
      id: migrated.players[0].id,
      displayName: 'An Nguyen',
      now: 1,
    });

    expect(playerStats(updated.history, updated.players[0])).toMatchObject({ matches: 1, wins: 1 });
    expect(
      createInitialState({ history: s.history, players: updated.players }).players.map((player) => player.id),
    ).toEqual(updated.players.map((player) => player.id));
  });

  it('scores a tournament fixture with the MVP engine and links the saved result', () => {
    const players = ['An', 'Binh', 'Chi'].map((displayName, index) => ({
      id: `player-${index + 1}`,
      displayName,
      level: '3.0',
      visibility: 'private' as const,
      formerNames: [],
      createdAt: 0,
      updatedAt: 0,
    }));
    const tournament = createTournament(
      {
        name: 'Local Cup',
        format: 'rr',
        config: { type: 's', mode: 'rally', fmt: 's', target: 11, winBy: 2 },
        courts: 2,
        entries: players.map((player) => ({
          id: `entry-${player.id}`,
          playerIds: [player.id],
          names: [player.displayName],
        })),
      },
      100,
    );
    const fixture = tournament.fixtures.find((item) => !item.bye)!;
    const first = tournament.entries.find((entry) => entry.id === fixture.participantIds[0])!;
    const second = tournament.entries.find((entry) => entry.id === fixture.participantIds[1])!;
    let s = reducer(createInitialState({ players }), {
      type: 'CREATE_TOURNAMENT',
      tournament,
    });
    s = reducer(s, { type: 'START_TOURNAMENT', id: tournament.id, now: 110 });
    s = reducer(s, {
      type: 'START_TOURNAMENT_FIXTURE',
      tournamentId: tournament.id,
      fixtureId: fixture.id,
      now: 200,
    });
    expect(s.match?.tournamentRef).toEqual({ tournamentId: tournament.id, fixtureId: fixture.id });
    expect(s.match?.names).toEqual([first.names, second.names]);
    expect(s.match?.playerIds).toEqual([first.playerIds, second.playerIds]);

    for (let point = 0; point < 11; point += 1)
      s = reducer(s, { type: 'RALLY', team: 0, now: 300 });
    s = reducer(s, { type: 'SAVE_MATCH' });

    const savedFixture = s.tournaments[0].fixtures.find((item) => item.id === fixture.id)!;
    expect(s.view).toBe('tournament');
    expect(s.history).toHaveLength(1);
    expect(s.history[0].tournamentRef).toEqual({
      tournamentId: tournament.id,
      fixtureId: fixture.id,
    });
    expect(s.history[0].names).toEqual([first.names, second.names]);
    const winnerProfile = s.players.find((player) => player.id === first.playerIds[0])!;
    expect(playerStats(s.history, winnerProfile)).toMatchObject({ matches: 1, wins: 1 });
    expect(savedFixture).toMatchObject({
      status: 'completed',
      result: { savedMatchId: 200, winner: 0, games: [[11, 0]] },
    });
    expect(s.tournaments[0].status).toBe('inProgress');
    expect(createInitialState({ tournaments: s.tournaments }).tournaments).toEqual(s.tournaments);
  });

  it('does not replace an unfinished standalone match with a tournament fixture', () => {
    const tournament = createTournament(
      {
        name: 'Local Cup',
        format: 'rr',
        config: { type: 's', mode: 'rally', fmt: 's', target: 11, winBy: 2 },
        courts: 2,
        entries: ['A', 'B', 'C'].map((name, index) => ({
          id: `entry-${index}`,
          playerIds: [`player-${index}`],
          names: [name],
        })),
      },
      100,
    );
    const fixture = tournament.fixtures.find((item) => !item.bye)!;
    const state = run(
      playSingles(),
      { type: 'CREATE_TOURNAMENT', tournament },
      { type: 'START_TOURNAMENT', id: tournament.id },
    );
    expect(
      reducer(state, {
        type: 'START_TOURNAMENT_FIXTURE',
        tournamentId: tournament.id,
        fixtureId: fixture.id,
      }),
    ).toBe(state);
  });

  it('preserves a player identity and historical name when updating a profile', () => {
    const player = {
      id: 'local-player-1',
      displayName: 'An',
      level: '3.0',
      visibility: 'private' as const,
      formerNames: [],
      createdAt: 0,
      updatedAt: 0,
    };
    const s = reducer(
      { ...createInitialState(), players: [player] },
      {
        type: 'UPDATE_PLAYER',
        id: player.id,
        displayName: 'An Nguyen',
        level: '4.0',
        visibility: 'tournament',
        now: 1,
      },
    );

    expect(s.players[0]).toMatchObject({
      id: player.id,
      displayName: 'An Nguyen',
      level: '4.0',
      visibility: 'tournament',
      formerNames: ['An'],
      createdAt: 0,
      updatedAt: 1,
    });
  });
});
