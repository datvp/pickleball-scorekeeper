import type { AppState } from './reducer';

const KEY = 'pickleball-scorekeeper:v1';

type Persisted = Pick<AppState, 'settings' | 'history' | 'match'>;

export function loadPersisted(): Partial<Persisted> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<Persisted>) : {};
  } catch {
    return {};
  }
}

export function savePersisted(state: AppState): void {
  try {
    const data: Persisted = {
      settings: state.settings,
      history: state.history,
      match: state.match,
    };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage may be full or unavailable (private mode); the app keeps working in memory.
  }
}

export function clearPersisted(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
