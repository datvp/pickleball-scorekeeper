import { matchMinutes } from '../domain/scoring';
import type { Score } from '../domain/types';
import { useT } from '../store/AppContext';

interface Props {
  games: Score[];
  match: { start: number; end?: number };
  /** Extra last row (used by the detail screen for date + config). */
  footer?: React.ReactNode;
}

export function GameList({ games, match, footer }: Props) {
  const { t } = useT();
  return (
    <>
      {games.map((g, i) => (
        <div className="gr" key={i}>
          <span>
            {t('game')} {i + 1}
          </span>
          <b>
            {g[0]}–{g[1]}
          </b>
        </div>
      ))}
      <div className="gr" style={footer ? undefined : { border: 0 }}>
        <span>{t('dur')}</span>
        <b>
          {matchMinutes(match)} {t('min')}
        </b>
      </div>
      {footer}
    </>
  );
}
