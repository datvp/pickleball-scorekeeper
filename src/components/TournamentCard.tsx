import type { Tournament } from '../domain/types';
import { useApp, useT } from '../store/AppContext';

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  const { dispatch } = useApp();
  const { t } = useT();
  const matches = tournament.fixtures.filter((item) => !item.bye);
  const completed = matches.filter((item) => item.status === 'completed').length;
  const format = tournament.format === 'rr' ? 'roundRobin' : 'singleElimination';

  return (
    <button
      type="button"
      className="mc"
      onClick={() => dispatch({ type: 'OPEN_TOURNAMENT', id: tournament.id })}
    >
      <span>
        <b>{tournament.name}</b>
        <br />
        <span className="mt">
          {t(format)} · {tournament.entries.length} {t('participants').toLowerCase()} ·{' '}
          {completed}/{matches.length}
        </span>
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        <span className={`tag ${tournament.status === 'completed' ? 'ok' : ''}`}>
          {t(tournament.status)}
        </span>
      </span>
    </button>
  );
}
