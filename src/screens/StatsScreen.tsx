import { aggregatePlayers, winRate } from '../domain/players';
import { useApp, useT } from '../store/AppContext';

export function StatsScreen() {
  const { state } = useApp();
  const { t } = useT();
  const total = state.history.length;
  const top = aggregatePlayers(state.history).slice(0, 5);
  const count = (type: 's' | 'd') => state.history.filter((m) => m.cfg.type === type).length;

  return (
    <div className="sc">
      <h1>{t('st')}</h1>
      {total ? (
        <>
          <div className="card">
            <p className="mt">{t('tot')}</p>
            <div className="big" style={{ color: 'var(--pr)' }}>
              {total}
            </div>
          </div>
          <div className="card">
            <p className="mt">{t('wr')}</p>
            {top.map((p) => (
              <div className="gr" key={p.name}>
                <span>{p.name}</span>
                <b>{winRate(p)}%</b>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="gr">
              <span>{t('s')}</span>
              <b>{count('s')}</b>
            </div>
            <div className="gr" style={{ border: 0 }}>
              <span>{t('d')}</span>
              <b>{count('d')}</b>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <b>{t('none')}</b>
          <p className="mt">{t('nostat')}</p>
        </div>
      )}
    </div>
  );
}
