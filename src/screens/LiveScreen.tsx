import type { CSSProperties } from 'react';
import {
  gamesToWin,
  isGamePoint,
  isMatchPoint,
  scoreCall,
  teamName,
  usesServerNumber,
} from '../domain/scoring';
import type { Match, TeamIndex } from '../domain/types';
import { vibrate } from '../hooks/useWakeLock';
import { useApp, useT } from '../store/AppContext';

const COLORS = ['var(--ta)', 'var(--tb)'] as const;
const colorVar = (k: TeamIndex) => ({ '--c': COLORS[k] }) as CSSProperties;

function TeamCard({ match, team }: { match: Match; team: TeamIndex }) {
  const { t } = useT();
  const serving = match.sv === team;
  const matchPoint = isMatchPoint(match, team);
  const gamePoint = isGamePoint(match, team);
  const side = match.sc[team] % 2 === 0 ? t('right') : t('left');

  return (
    <div className={`tm ${serving ? 'sv' : ''}`} style={colorVar(team)}>
      <div className="n">{teamName(match, team)}</div>
      <div className="big" aria-label={String(match.sc[team])}>
        {match.sc[team]}
      </div>
      <div className="sb">
        {serving ? (
          <>
            🏓 {t('srv')}
            <br />
            {usesServerNumber(match.cfg) && `${t('sn')} ${match.sn} · `}
            {side}
          </>
        ) : (
          '\u00a0'
        )}
      </div>
      <div>
        {matchPoint ? (
          <span className="bd m">{t('mp')}</span>
        ) : gamePoint ? (
          <span className="bd">{t('gp')}</span>
        ) : (
          '\u00a0'
        )}
      </div>
    </div>
  );
}

export function LiveScreen() {
  const { state, dispatch } = useApp();
  const { t } = useT();
  const m = state.match;
  if (!m) return null;
  const c = m.cfg;

  const rally = (team: TeamIndex) => {
    if (m.status !== 'active' || m.paused) return;
    dispatch({ type: 'RALLY', team });
    if (state.settings.haptics) vibrate(15);
  };

  const rallyButton = (team: TeamIndex) => (
    <button
      type="button"
      className="rb"
      style={colorVar(team)}
      aria-label={`${teamName(m, team)} ${t('won')}`}
      onClick={() => rally(team)}
    >
      {t(team ? 'teamB' : 'teamA')}
      <br />
      <span style={{ fontSize: 13 }}>{t('won')}</span>
    </button>
  );

  const lastGame = m.games[m.games.length - 1];

  return (
    <div className="sc" style={{ gap: 10 }}>
      <div className="row sp">
        <button type="button" onClick={() => dispatch({ type: 'PAUSE' })}>
          ⏸ {t('pause')}
        </button>
        <span className="mt">
          {t('game')} {m.gn}
          {gamesToWin(c) === 2 ? '/3' : ''} · {c.target} · {t(c.mode)}
          <br />
          {m.gw[0]}–{m.gw[1]}
        </span>
        <button type="button" onClick={() => dispatch({ type: 'SET_MODAL', modal: 'end' })}>
          {t('end')}
        </button>
      </div>

      <div className="call" aria-live="polite">
        {m.so && <span className="bd">{t('so')}</span>} {t('call')}: {scoreCall(m)}
      </div>

      <div className="teams">
        <TeamCard match={m} team={0} />
        <TeamCard match={m} team={1} />
      </div>
      <div className="teams">
        {rallyButton(0)}
        {rallyButton(1)}
      </div>

      <button
        type="button"
        style={{ minHeight: 56 }}
        disabled={m.stack.length === 0}
        onClick={() => dispatch({ type: 'UNDO' })}
      >
        ↶ {t('undo')}
      </button>
      <p className="mt" style={{ textAlign: 'center' }}>
        {t('tip')}
      </p>

      {m.paused && (
        <div className="ov">
          <div className="card">
            <h2>{t('paused')}</h2>
            <button type="button" className="b" onClick={() => dispatch({ type: 'RESUME_PLAY' })}>
              {t('cont')}
            </button>
          </div>
        </div>
      )}

      {m.status === 'gameover' && lastGame && (
        <div className="ov">
          <div className="card">
            <h2>{t('gend')}</h2>
            <div className="big" style={{ fontSize: 56, color: 'var(--tx)' }}>
              {lastGame.join('–')}
            </div>
            <p className="mt">
              {m.gw[0]}–{m.gw[1]}
            </p>
            <button type="button" className="b" onClick={() => dispatch({ type: 'NEXT_GAME' })}>
              {t('nextg')}
            </button>
            <button type="button" onClick={() => dispatch({ type: 'UNDO' })}>
              ↶ {t('undo')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
