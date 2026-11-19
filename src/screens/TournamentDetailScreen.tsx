import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { PermissionMatrix } from '../components/PermissionMatrix';
import {
  roundRobinStandings,
  singleEliminationResults,
  tournamentEntryName,
} from '../domain/tournaments';
import type { TournamentFixture } from '../domain/types';
import { useApp, useT } from '../store/AppContext';

type DetailTab = 'matches' | 'standings' | 'report' | 'team';

export function TournamentDetailScreen() {
  const { state, dispatch } = useApp();
  const { t } = useT();
  const [tab, setTab] = useState<DetailTab>('matches');
  const tournament = state.tournaments.find((item) => item.id === state.selectedTournamentId);
  if (!tournament) return null;

  const activeMatch = state.match;
  const blockedByMatch = !!activeMatch;
  const formatLabel = tournament.format === 'rr' ? 'roundRobin' : 'singleElimination';
  const sortedFixtures = [...tournament.fixtures].sort(
    (a, b) => a.round - b.round || a.position - b.position,
  );
  const standings = tournament.format === 'rr' ? roundRobinStandings(tournament) : [];
  const elimination = tournament.format === 'se' ? singleEliminationResults(tournament) : null;
  const maxRound = Math.max(0, ...tournament.fixtures.map((item) => item.round));
  const roundName = (round: number) => {
    if (tournament.format !== 'se') return `${t('round')} ${round}`;
    const remaining = maxRound - round;
    if (remaining === 0) return t('final');
    if (remaining === 1) return t('semifinal');
    if (remaining === 2) return t('quarterfinal');
    return `${t('round')} ${round}`;
  };

  const openFixture = (fixture: TournamentFixture) => {
    if (
      activeMatch?.tournamentRef?.tournamentId === tournament.id &&
      activeMatch.tournamentRef.fixtureId === fixture.id
    ) {
      dispatch({ type: 'RESUME_MATCH' });
      return;
    }
    dispatch({
      type: 'START_TOURNAMENT_FIXTURE',
      tournamentId: tournament.id,
      fixtureId: fixture.id,
    });
  };

  return (
    <div className="sc">
      <ScreenHeader title={tournament.name} back="tournaments" />
      <div className="row">
        <span className={`tag ${tournament.status === 'completed' ? 'ok' : ''}`}>
          {t(tournament.status)}
        </span>
        <span className="tag">{t(formatLabel)}</span>
        <span className="mt">
          {t(tournament.config.type)} · {tournament.config.target}
        </span>
      </div>

      {tournament.status === 'ready' && (
        <button
          type="button"
          className="b"
          onClick={() => dispatch({ type: 'START_TOURNAMENT', id: tournament.id })}
        >
          {t('startTournament')}
        </button>
      )}
      {blockedByMatch &&
        !(
          activeMatch?.tournamentRef?.tournamentId === tournament.id &&
          tournament.fixtures.some(
            (fixture) => fixture.id === activeMatch.tournamentRef?.fixtureId,
          )
        ) && (
        <p className="warn">{t('tournamentMatchBlocked')}</p>
      )}

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'matches', label: t('matches') },
          { value: 'standings', label: t('standings') },
          {
            value: 'report',
            label: t('report'),
            disabled: true,
            disabledDescription: t('reportDeferred'),
          },
          {
            value: 'team',
            label: t('team'),
          },
        ]}
      />

      {tab === 'matches' &&
        sortedFixtures.map((fixture) => {
          const first = tournamentEntryName(tournament, fixture.participantIds[0]);
          const second = tournamentEntryName(tournament, fixture.participantIds[1]);
          const roundLabel = roundName(fixture.round);
          if (fixture.bye) {
            return (
              <div className="card" key={fixture.id}>
                <span className="mt">
                  {roundLabel} · {first} · {t('bye')}
                </span>
              </div>
            );
          }

          const canScore =
            tournament.status === 'inProgress' &&
            fixture.status !== 'completed' &&
            !!fixture.participantIds[0] &&
            !!fixture.participantIds[1] &&
            (!blockedByMatch ||
              (activeMatch?.tournamentRef?.tournamentId === tournament.id &&
                activeMatch.tournamentRef.fixtureId === fixture.id));
          const statusLabel =
            fixture.status === 'completed' && fixture.result
              ? fixture.result.games.map((game) => game.join('–')).join(', ')
              : !fixture.participantIds[0] || !fixture.participantIds[1]
                ? '—'
                : t(fixture.status === 'inProgress' ? 'inProgress' : 'scheduled');
          const content = (
            <>
              <span>
                <b>{first || '—'}</b> vs <b>{second || '—'}</b>
                <br />
                <span className="mt">
                  {roundLabel}
                  {fixture.court ? ` · ${t('court')} ${fixture.court}` : ''}
                </span>
              </span>
              <span className="w" style={{ fontSize: 20 }}>
                {statusLabel}
              </span>
            </>
          );
          return canScore ? (
            <button
              type="button"
              className="mc"
              key={fixture.id}
              onClick={() => openFixture(fixture)}
            >
              {content}
            </button>
          ) : (
            <div className="mc ro" key={fixture.id}>
              {content}
            </div>
          );
        })}

      {tab === 'team' && (
        <>
          <div className="card">
            <b>{t('team')}</b>
            <div className="gr">
              <span>{t('roleOwner')}</span>
              <span>{t('localOwner')}</span>
            </div>
            <p className="warn">{t('localOwnerNote')}</p>
          </div>
          <PermissionMatrix />
        </>
      )}

      {tab === 'standings' &&
        (tournament.format === 'rr' ? (
          <>
            <div className="card">
              <div className="tb h">
                <span>#</span>
                <span>{t('participants')}</span>
                <span>{t('played')}</span>
                <span>{t('wins')}</span>
                <span>{t('losses')}</span>
                <span>{t('diff')}</span>
                <span>{t('pointsFor')}</span>
                <span>{t('bye')}</span>
              </div>
              {standings.map((standing) => (
                <div className="tb" key={standing.entryId}>
                  <b>{standing.rank}</b>
                  <span>{tournamentEntryName(tournament, standing.entryId)}</span>
                  <span>{standing.played}</span>
                  <span>{standing.wins}</span>
                  <span>{standing.losses}</span>
                  <span>
                    {standing.pointDifference > 0 ? '+' : ''}
                    {standing.pointDifference}
                  </span>
                  <span>{standing.pointsFor}</span>
                  <span>{standing.byes}</span>
                </div>
              ))}
            </div>
            <p className="warn">{t('standingTieBreak')}</p>
          </>
        ) : (
          <div className="card">
            <p className="mt">{t('tournamentWinner')}</p>
            <div className="w">
              🏆 {elimination?.champion ? tournamentEntryName(tournament, elimination.champion) : '—'}
            </div>
            <div className="gr">
              <span>{t('runnerUp')}</span>
              <b>
                {elimination?.runnerUp
                  ? tournamentEntryName(tournament, elimination.runnerUp)
                  : '—'}
              </b>
            </div>
            {elimination?.eliminated.map((item) => (
              <div className="gr" key={`${item.entryId}-${item.round}`}>
                <span>{tournamentEntryName(tournament, item.entryId)}</span>
                <span className="mt">
                  {t('round')} {item.round}
                </span>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
