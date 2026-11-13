import { GameList } from '../components/GameList';
import { ScreenHeader } from '../components/ScreenHeader';
import { teamName } from '../domain/scoring';
import { locale } from '../i18n/useI18n';
import { useApp, useT } from '../store/AppContext';
import { HistoryScreen } from './HistoryScreen';

export function DetailScreen() {
  const { state } = useApp();
  const { t, lang } = useT();
  const m = state.detailIndex === null ? undefined : state.history[state.detailIndex];
  if (!m) return <HistoryScreen />;

  return (
    <div className="sc">
      <ScreenHeader title={t('hist')} back="history" />
      <div className="card">
        <h2>
          {teamName(m, 0)}
          <br />
          <span className="mt">vs</span>
          <br />
          {teamName(m, 1)}
        </h2>
        <div className="w" style={{ marginTop: 8 }}>
          🏆 {teamName(m, m.winner)} · {m.gw[0]}–{m.gw[1]}
        </div>
      </div>
      <div className="card">
        <GameList
          games={m.games}
          match={m}
          footer={
            <div className="gr" style={{ border: 0 }}>
              <span>{new Date(m.end).toLocaleString(locale(lang))}</span>
              <span>
                {t(m.cfg.type)} · {t(m.cfg.mode)} · {m.cfg.target}
              </span>
            </div>
          }
        />
      </div>
    </div>
  );
}
