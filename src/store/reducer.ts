import {
  applyRally,
  createMatch,
  nextGame,
  toSavedMatch,
  undo,
} from '../domain/scoring';
import type {
  Lang,
  Match,
  MatchConfig,
  SavedMatch,
  TeamIndex,
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
  | 'roster'
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
  /** Current (or just finished, not yet saved) match. */
  match: Match | null;
  // Transient UI / setup state (not persisted)
  view: View;
  cfg: MatchConfig;
  names: string[];
  firstServer: TeamIndex;
  modal: ModalKind;
  detailIndex: number | null;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: 'vi',
  theme: 'dark',
  keepAwake: true,
  haptics: true,
};

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
  | { type: 'START_MATCH'; names: [string[], string[]]; now?: number }
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
  | { type: 'SET_LANG'; lang: Lang }
  | { type: 'SET_THEME'; theme: ThemeName }
  | { type: 'TOGGLE'; key: ToggleKey };

export function createInitialState(
  persisted?: Partial<Pick<AppState, 'settings' | 'history' | 'match'>>,
): AppState {
  return {
    settings: { ...DEFAULT_SETTINGS, ...persisted?.settings },
    history: persisted?.history ?? [],
    match: persisted?.match ?? null,
    view: 'home',
    cfg: { ...DEFAULT_CONFIG },
    names: [...EMPTY_NAMES],
    firstServer: 0,
    modal: null,
    detailIndex: null,
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
        match: createMatch(s.cfg, a.names, s.firstServer, a.now),
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
      return { ...s, history: [], match: null, modal: null, view: 'home' };

    case 'SAVE_MATCH': {
      if (!s.match) return s;
      const saved = toSavedMatch(s.match);
      const already = saved ? s.history.some((h) => h.id === saved.id) : true;
      return {
        ...s,
        history: saved && !already ? [saved, ...s.history] : s.history,
        match: null,
        view: 'history',
      };
    }

    case 'NEW_MATCH':
      return { ...s, match: null, names: [...EMPTY_NAMES], view: 'setup' };

    case 'OPEN_DETAIL':
      return { ...s, detailIndex: a.index, view: 'detail' };

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
