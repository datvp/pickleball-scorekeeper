import { teamName } from '../domain/scoring';
import type { SavedMatch } from '../domain/types';
import { locale } from '../i18n/useI18n';
import { useApp, useT } from '../store/AppContext';

export function MatchCard({ match, index }: { match: SavedMatch; index: number }) {
  const { dispatch } = useApp();
  const { t, lang } = useT();
  return (
    <button
      type="button"
      className="mc"
      onClick={() => dispatch({ type: 'OPEN_DETAIL', index })}
    >
      <span>
        <b>{teamName(match, 0)}</b> vs <b>{teamName(match, 1)}</b>
        <br />
        <span className="mt">
          {new Date(match.end).toLocaleDateString(locale(lang))} · {t(match.cfg.type)} ·{' '}
          {t(match.cfg.mode)}
        </span>
      </span>
      <span className="w" style={{ fontSize: 22 }}>
        {match.gw[0]}–{match.gw[1]}
      </span>
    </button>
  );
}
