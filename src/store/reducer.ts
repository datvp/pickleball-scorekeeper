import {
  applyRally,
  createMatch,
  nextGame,
  toSavedMatch,
  undo,
} from '../domain/scoring';
import {
  createDemoTournamentState,
  isDuplicatePlayerName,
  migrateLegacyPlayers,
  playerIdsForNames,
} from '../domain/players';
import {
  fixtureMatchNames,
  saveTournamentResult,
  startTournamentFixture,
} from '../domain/tournaments';
import type {
  Lang,
  Match,
  MatchConfig,
  PlayerIds,
  PlayerProfile,
  ProfileVisibility,
  SavedMatch,
  TeamIndex,
  Tournament,
  ThemeName,
} from '../domain/types';

export type View =
  | 'home'
  | 'setup'
  | 'setupPlayers'
  | 'live'
  | 'result'
  | 'history'
  | 'detail'
  | 'tournaments'
  | 'tournamentSetup'
  | 'tournament'
  | 'roster'
  | 'player'
  | 'stats'
  | 'settings';

export type ModalKind = 'end' | 'clear' | null;
export type ToggleKey = 'keepAwake' | 'haptics';

export interface Settings {
  lang: Lang;
  theme: ThemeName;
  keepAwake: boolean;
  haptics: boolean;
}

export interface AppState {
  settings: Settings;
  history: SavedMatch[];
  players: PlayerProfile[];
  tournaments: Tournament[];
  /** Current (or just finished, not yet saved) match. */
  match: Match | null;
  // Transient UI / setup state (not persisted)
  view: View;
  cfg: MatchConfig;
  names: string[];
  firstServer: TeamIndex;
  modal: ModalKind;
  detailIndex: number | null;
  selectedPlayerId: string | null;
  selectedTournamentId: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: 'vi',
  theme: 'soft-sage',
  keepAwake: true,
  haptics: true,
};

const THEME_NAMES: readonly ThemeName[] = ['soft-sage', 'blush', 'linen', 'taupe', 'deep-sage'];

function isThemeName(theme: unknown): theme is ThemeName {
  return THEME_NAMES.some((name) => name === theme);
}

export const DEFAULT_CONFIG: MatchConfig = {
  type: 'd',
  mode: 'trad',
  fmt: 's',
  target: 11,
  winBy: 2,
};

const EMPTY_NAMES = ['', '', '', ''];

export type Action =
  | { type: 'NAVIGATE'; view: View }
  | { type: 'QUICK_START' }
  | { type: 'SET_CONFIG'; patch: Partial<MatchConfig> }
  | { type: 'SET_NAME'; slot: number; value: string }
  | { type: 'SET_FIRST_SERVER'; team: TeamIndex }
  | {
      type: 'START_MATCH';
      names: [string[], string[]];
      players?: PlayerProfile[];
      playerIds?: PlayerIds;
      now?: number;
    }
  | { type: 'RALLY'; team: TeamIndex; now?: number }
  | { type: 'UNDO' }
  | { type: 'NEXT_GAME' }
  | { type: 'PAUSE' }
  | { type: 'RESUME_PLAY' }
  | { type: 'RESUME_MATCH' }
  | { type: 'SET_MODAL'; modal: ModalKind }
  | { type: 'END_MATCH' }
  | { type: 'CLEAR_ALL' }
  | { type: 'SAVE_MATCH' }
  | { type: 'NEW_MATCH' }
  | { type: 'OPEN_DETAIL'; index: number }
  | { type: 'CREATE_TOURNAMENT'; tournament: Tournament }
  | { type: 'OPEN_TOURNAMENT'; id: string }
  | { type: 'START_TOURNAMENT'; id: string; now?: number }
  | { type: 'START_TOURNAMENT_FIXTURE'; tournamentId: string; fixtureId: string; now?: number }
  | { type: 'ADD_PLAYER'; player: PlayerProfile }
  | {
      type: 'UPDATE_PLAYER';
      id: string;
      displayName: string;
      level?: string;
      visibility?: ProfileVisibility;
      now: number;
    }
  | { type: 'OPEN_PLAYER'; id: string }
  | { type: 'SET_LANG'; lang: Lang }
  | { type: 'SET_THEME'; theme: ThemeName }
  | { type: 'TOGGLE'; key: ToggleKey };

export function createInitialState(
  persisted?: Partial<
    Pick<AppState, 'settings' | 'history' | 'match' | 'players' | 'tournaments'>
  >,
): AppState {
  const persistedSettings = persisted?.settings;
  const hasPersistedState = persisted !== undefined && Object.keys(persisted).length > 0;
  const demoState = hasPersistedState ? null : createDemoTournamentState();
  const players = (
    persisted?.players ?? demoState?.players ?? migrateLegacyPlayers(persisted?.history ?? [])
  ).map((player) => ({ ...player, visibility: player.visibility ?? 'private' }));
  const history = (persisted?.history ?? []).map((match) => ({
    ...match,
    playerIds: match.playerIds ?? playerIdsForNames(players, match.names),
  }));
  const match = persisted?.match
    ? {
        ...persisted.match,
        playerIds:
          persisted.match.playerIds ?? playerIdsForNames(players, persisted.match.names),
      }
    : null;
  return {
    settings: {
      ...DEFAULT_SETTINGS,
      ...persistedSettings,
      theme: isThemeName(persistedSettings?.theme)
        ? persistedSettings.theme
        : DEFAULT_SETTINGS.theme,
    },
    history,
    players,
    tournaments: persisted?.tournaments ?? demoState?.tournaments ?? [],
    match,
    view: 'home',
    cfg: { ...DEFAULT_CONFIG },
    names: [...EMPTY_NAMES],
    firstServer: 0,
    modal: null,
    detailIndex: null,
    selectedPlayerId: null,
    selectedTournamentId: null,
  };
}

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'NAVIGATE':
      return { ...s, view: a.view };

    case 'QUICK_START':
      return { ...s, names: [...EMPTY_NAMES], firstServer: 0, view: 'setup' };

    case 'SET_CONFIG':
      return { ...s, cfg: { ...s.cfg, ...a.patch } };

    case 'SET_NAME': {
      const names = [...s.names];
      names[a.slot] = a.value;
      return { ...s, names };
    }

    case 'SET_FIRST_SERVER':
      return { ...s, firstServer: a.team };

    case 'START_MATCH':
      return {
        ...s,
        players: a.players ?? s.players,
        match: createMatch(s.cfg, a.names, s.firstServer, a.now, a.playerIds),
        view: 'live',
      };

    case 'RALLY': {
      if (!s.match) return s;
      const match = applyRally(s.match, a.team, a.now);
      if (match === s.match) return s;
      return { ...s, match, view: match.status === 'done' ? 'result' : s.view };
    }

    case 'UNDO':
      if (!s.match || s.match.stack.length === 0) return s;
      return { ...s, match: undo(s.match), view: 'live' };

    case 'NEXT_GAME':
      return s.match ? { ...s, match: nextGame(s.match) } : s;

    case 'PAUSE':
      return s.match ? { ...s, match: { ...s.match, paused: true } } : s;

    case 'RESUME_PLAY':
      return s.match ? { ...s, match: { ...s.match, paused: false } } : s;

    case 'RESUME_MATCH':
      return s.match ? { ...s, view: s.match.status === 'done' ? 'result' : 'live' } : s;

    case 'SET_MODAL':
      return { ...s, modal: a.modal };

    case 'END_MATCH':
      return { ...s, match: null, modal: null, view: 'home' };

    case 'CLEAR_ALL':
      return {
        ...s,
        history: [],
        players: [],
        tournaments: [],
        match: null,
        modal: null,
        selectedPlayerId: null,
        selectedTournamentId: null,
        view: 'home',
      };

    case 'SAVE_MATCH': {
      if (!s.match) return s;
      const saved = toSavedMatch(s.match);
      const already = saved ? s.history.some((h) => h.id === saved.id) : true;
      const tournamentRef = s.match.tournamentRef;
      const tournament = tournamentRef
        ? s.tournaments.find((item) => item.id === tournamentRef.tournamentId)
        : undefined;
      const fixture = tournament
        ? tournament.fixtures.find((item) => item.id === tournamentRef?.fixtureId)
        : undefined;
      const tournaments =
        saved && tournament && fixture && fixture.result?.savedMatchId !== saved.id
          ? s.tournaments.map((item) =>
              item.id === tournament.id
                ? saveTournamentResult(
                    item,
                    fixture.id,
                    {
                      savedMatchId: saved.id,
                      games: saved.games,
                      winner: saved.winner,
                      completedAt: saved.end,
                    },
                    saved.end,
                  )
                : item,
            )
          : s.tournaments;
      return {
        ...s,
        history: saved && !already ? [saved, ...s.history] : s.history,
        tournaments,
        match: null,
        view: tournamentRef ? 'tournament' : 'history',
      };
    }

    case 'NEW_MATCH':
      return { ...s, match: null, names: [...EMPTY_NAMES], view: 'setup' };

    case 'OPEN_DETAIL':
      return { ...s, detailIndex: a.index, view: 'detail' };

    case 'CREATE_TOURNAMENT':
      return {
        ...s,
        tournaments: [a.tournament, ...s.tournaments],
        selectedTournamentId: a.tournament.id,
        view: 'tournament',
      };

    case 'OPEN_TOURNAMENT':
      return { ...s, selectedTournamentId: a.id, view: 'tournament' };

    case 'START_TOURNAMENT': {
      const tournament = s.tournaments.find((item) => item.id === a.id);
      if (!tournament || tournament.status !== 'ready') return s;
      return {
        ...s,
        tournaments: s.tournaments.map((item) =>
          item.id === tournament.id
            ? { ...item, status: 'inProgress', updatedAt: a.now ?? Date.now() }
            : item,
        ),
      };
    }

    case 'START_TOURNAMENT_FIXTURE': {
      const tournament = s.tournaments.find((item) => item.id === a.tournamentId);
      const selectedFixture = tournament?.fixtures.find((item) => item.id === a.fixtureId);
      if (
        !tournament ||
        tournament.status !== 'inProgress' ||
        !selectedFixture ||
        s.match
      )
        return s;
      const names = fixtureMatchNames(tournament, selectedFixture);
      const firstEntry = tournament.entries.find(
        (entry) => entry.id === selectedFixture.participantIds[0],
      );
      const secondEntry = tournament.entries.find(
        (entry) => entry.id === selectedFixture.participantIds[1],
      );
      if (!names || !firstEntry || !secondEntry) return s;
      const now = a.now ?? Date.now();
      const started = startTournamentFixture(tournament, selectedFixture.id, now);
      const match = createMatch(
        tournament.config,
        names,
        0,
        now,
        [[...firstEntry.playerIds], [...secondEntry.playerIds]],
      );
      match.tournamentRef = { tournamentId: tournament.id, fixtureId: selectedFixture.id };
      return {
        ...s,
        tournaments: s.tournaments.map((item) => (item.id === tournament.id ? started : item)),
        selectedTournamentId: tournament.id,
        match,
        view: 'live',
      };
    }

    case 'ADD_PLAYER': {
      const displayName = a.player.displayName.trim();
      if (!displayName || isDuplicatePlayerName(s.players, displayName)) return s;
      return { ...s, players: [...s.players, { ...a.player, displayName }] };
    }

    case 'UPDATE_PLAYER': {
      const player = s.players.find((item) => item.id === a.id);
      if (
        !player ||
        !a.displayName.trim() ||
        isDuplicatePlayerName(s.players, a.displayName, a.id)
      )
        return s;
      const displayName = a.displayName.trim();
      const level = a.level?.trim() || player.level;
      const formerNames =
        displayName === player.displayName
          ? player.formerNames
          : [...new Set([...player.formerNames, player.displayName])];
      return {
        ...s,
        players: s.players.map((item) =>
          item.id === a.id
            ? {
                ...item,
                displayName,
                level,
                visibility: a.visibility ?? item.visibility,
                formerNames,
                updatedAt: a.now,
              }
            : item,
        ),
      };
    }

    case 'OPEN_PLAYER':
      return { ...s, selectedPlayerId: a.id, view: 'player' };

    case 'SET_LANG':
      return { ...s, settings: { ...s.settings, lang: a.lang } };

    case 'SET_THEME':
      return { ...s, settings: { ...s.settings, theme: a.theme } };

    case 'TOGGLE':
      return { ...s, settings: { ...s.settings, [a.key]: !s.settings[a.key] } };

    default:
      return s;
  }
}
