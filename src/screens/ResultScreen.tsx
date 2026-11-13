import { useState } from 'react';
import { GameList } from '../components/GameList';
import { matchSummary, teamName } from '../domain/scoring';
import { useApp, useT } from '../store/AppContext';

export function ResultScreen() {
  const { state, dispatch } = useApp();
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const m = state.match;
  if (!m || m.winner === undefined) return null;

  const saved = state.history.some((h) => h.id === m.start);

  const share = async () => {
    const text = matchSummary(m);
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* share dialog dismissed */
    }
  };

  return (
    <div className="sc">
      <p className="mt">{t('winner')}</p>
      <div className="w">🏆 {teamName(m, m.winner)}</div>
      <div className="big" style={{ color: 'var(--tx)', fontSize: 72 }}>
        {m.gw[0]}–{m.gw[1]}
      </div>

      <div className="card">
        <b>{t('games')}</b>
        <GameList games={m.games} match={m} />
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {copied && (
          <p className="mt" role="status" style={{ textAlign: 'center' }}>
            {t('copied')}
          </p>
        )}
        <button
          type="button"
          className="b"
          disabled={saved}
          onClick={() => dispatch({ type: 'SAVE_MATCH' })}
        >
          {saved && '✓'} {t('save')}
        </button>
        <div className="row">
          <button type="button" style={{ flex: 1 }} onClick={share}>
            {t('share')}
          </button>
          <button type="button" style={{ flex: 1 }} onClick={() => dispatch({ type: 'UNDO' })}>
            ↶ {t('undo')}
          </button>
          <button type="button" style={{ flex: 1 }} onClick={() => dispatch({ type: 'NEW_MATCH' })}>
            {t('newm')}
          </button>
        </div>
      </div>
    </div>
  );
}
