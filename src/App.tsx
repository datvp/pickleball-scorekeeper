import { BottomNav, NAV_VIEWS } from './components/BottomNav';
import { ConfirmModal } from './components/Modal';
import { useWakeLock } from './hooks/useWakeLock';
import { DetailScreen } from './screens/DetailScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LiveScreen } from './screens/LiveScreen';
import { PlayersSetupScreen } from './screens/PlayersSetupScreen';
import { PlayerProfileScreen } from './screens/PlayerProfileScreen';
import { ResultScreen } from './screens/ResultScreen';
import { RosterScreen } from './screens/RosterScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SetupScreen } from './screens/SetupScreen';
import { StatsScreen } from './screens/StatsScreen';
import { TournamentDetailScreen } from './screens/TournamentDetailScreen';
import { TournamentSetupScreen } from './screens/TournamentSetupScreen';
import { TournamentsScreen } from './screens/TournamentsScreen';
import { useApp } from './store/AppContext';
import type { View } from './store/reducer';

const SCREENS: Record<View, () => React.ReactNode> = {
  home: () => <HomeScreen />,
  setup: () => <SetupScreen />,
  setupPlayers: () => <PlayersSetupScreen />,
  live: () => <LiveScreen />,
  result: () => <ResultScreen />,
  history: () => <HistoryScreen />,
  detail: () => <DetailScreen />,
  roster: () => <RosterScreen />,
  player: () => <PlayerProfileScreen />,
  stats: () => <StatsScreen />,
  settings: () => <SettingsScreen />,
  tournaments: () => <TournamentsScreen />,
  tournamentSetup: () => <TournamentSetupScreen />,
  tournament: () => <TournamentDetailScreen />,
};

export function App() {
  const { state } = useApp();
  useWakeLock(state.settings.keepAwake && state.view === 'live');

  // A match-dependent view without a match (e.g. stale state) falls back to home.
  const needsMatch = state.view === 'live' || state.view === 'result';
  const view: View =
    needsMatch && !state.match
      ? 'home'
      : state.view === 'player' && !state.players.some((player) => player.id === state.selectedPlayerId)
        ? 'roster'
        : state.view === 'tournament' &&
            !state.tournaments.some((tournament) => tournament.id === state.selectedTournamentId)
          ? 'tournaments'
        : state.view;

  return (
    <>
      {SCREENS[view]()}
      {NAV_VIEWS.includes(view) && <BottomNav />}
      <ConfirmModal />
    </>
  );
}
