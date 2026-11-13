import { aggregatePlayers, winRate } from '../domain/players';
import { useApp, useT } from '../store/AppContext';

export function RosterScreen() {
  const { state } = useApp();
  const { t } = useT();
  const players = aggregatePlayers(state.history);
  return (
    <div className="sc">
      <h1>{t('pl')}</h1>
      {players.length ? (
        players.map((p) => (
          <div className="card row sp" key={p.name}>
            <b>{p.name}</b>
            <span className="mt">
              {p.wins}/{p.matches} · {winRate(p)}%
            </span>
          </div>
        ))
      ) : (
        <div className="card">
          <b>{t('none')}</b>
          <p className="mt">{t('nostat')}</p>
        </div>
      )}
    </div>
  );
}
