import { TournamentCard } from '../components/TournamentCard';
import { useApp, useT } from '../store/AppContext';

export function TournamentsScreen() {
  const { state, dispatch } = useApp();
  const { t } = useT();

  return (
    <div className="sc">
      <h1>{t('tours')}</h1>
      <button
        type="button"
        className="b"
        onClick={() => dispatch({ type: 'NAVIGATE', view: 'tournamentSetup' })}
      >
        ＋ {t('newTournament')}
      </button>
      {state.tournaments.length ? (
        state.tournaments.map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))
      ) : (
        <div className="card">
          <b>{t('tours')}</b>
          <p className="mt">{t('noTournaments')}</p>
        </div>
      )}
    </div>
  );
}
