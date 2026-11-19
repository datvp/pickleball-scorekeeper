import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from 'react';
import { useAuth } from '../auth/AuthProvider';
import { syncDemoDataToSupabase } from '../auth/demoSync';
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
  const { session } = useAuth();
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialState(loadPersisted()),
  );
  const lastSyncedDemo = useRef<string | null>(null);

  useEffect(() => {
    savePersisted(state);
  }, [state.settings, state.history, state.match, state.players, state.tournaments]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
    document.documentElement.lang = state.settings.lang;
  }, [state.settings.theme, state.settings.lang]);

  useEffect(() => {
    if (!session?.user?.id) {
      lastSyncedDemo.current = null;
      return;
    }

    const signature = JSON.stringify({
      players: state.players.filter((player) => player.displayName.trim().length > 0).map((player) => ({
        id: player.id,
        displayName: player.displayName,
        updatedAt: player.updatedAt,
      })),
      tournaments: state.tournaments.map((tournament) => ({
        id: tournament.id,
        name: tournament.name,
        updatedAt: tournament.updatedAt,
      })),
    });
    if (lastSyncedDemo.current === signature) return;
    lastSyncedDemo.current = signature;
    void syncDemoDataToSupabase(session.user.id, state.players, state.tournaments);
  }, [session?.user?.id, state.players, state.tournaments]);

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
