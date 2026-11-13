import { MatchCard } from '../components/MatchCard';
import { useApp, useT } from '../store/AppContext';

export function HistoryScreen() {
  const { state } = useApp();
  const { t } = useT();
  return (
    <div className="sc">
      <h1>{t('hist')}</h1>
      {state.history.length ? (
        state.history.map((m, i) => <MatchCard key={m.id} match={m} index={i} />)
      ) : (
        <div className="card">
          <b>{t('none')}</b>
          <p className="mt">{t('nonehint')}</p>
        </div>
      )}
    </div>
  );
}
