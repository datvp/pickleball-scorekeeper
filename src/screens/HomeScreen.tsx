import { MatchCard } from '../components/MatchCard';
import { teamName } from '../domain/scoring';
import { useApp, useT } from '../store/AppContext';

export function HomeScreen() {
  const { state, dispatch } = useApp();
  const { t } = useT();
  const { match, history } = state;
  const recent = history.slice(0, 3);

  return (
    <div className="sc">
      <div className="row sp">
        <span className="tag">🏓 Pickleball</span>
        <button
          type="button"
          className="ic"
          aria-label={t('set')}
          onClick={() => dispatch({ type: 'NAVIGATE', view: 'settings' })}
        >
          ⚙
        </button>
      </div>

      <div>
        <h1>
          Pickleball
          <br />
          Scorekeeper
        </h1>
        <p className="mt">{t('tag')}</p>
      </div>

      {match && (
        <button
          type="button"
          className="card mc"
          onClick={() => dispatch({ type: 'RESUME_MATCH' })}
        >
          <span>
            <b>{match.status === 'done' ? t('view') : t('resume')}</b>
            <br />
            <span className="mt">
              {teamName(match, 0)} vs {teamName(match, 1)} · {match.sc[0]}–{match.sc[1]}
            </span>
          </span>
          <span className="w">▶</span>
        </button>
      )}

      <button type="button" className="b" onClick={() => dispatch({ type: 'QUICK_START' })}>
        {t('quick')}
      </button>

      <h2>{t('recent')}</h2>
      {recent.length ? (
        recent.map((m, i) => <MatchCard key={m.id} match={m} index={i} />)
      ) : (
        <div className="card">
          <b>{t('none')}</b>
          <p className="mt">{t('nonehint')}</p>
        </div>
      )}
    </div>
  );
}
