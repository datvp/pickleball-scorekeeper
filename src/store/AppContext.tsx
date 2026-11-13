import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import { translate } from '../i18n/useI18n';
import type { StringKey } from '../i18n/strings';
import { createInitialState, reducer, type Action, type AppState } from './reducer';
import { loadPersisted, savePersisted } from './storage';

interface Ctx {
  state: AppState;
  dispatch: Dispatch<Action>;
}

export const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialState(loadPersisted()),
  );

  useEffect(() => {
    savePersisted(state);
  }, [state.settings, state.history, state.match]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
    document.documentElement.lang = state.settings.lang;
  }, [state.settings.theme, state.settings.lang]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

/** Translation helper bound to the current language. */
export function useT() {
  const { state } = useApp();
  const lang = state.settings.lang;
  return { lang, t: (key: StringKey) => translate(lang, key) };
}
