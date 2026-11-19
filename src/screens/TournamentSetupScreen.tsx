import { useMemo, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { DEFAULT_CONFIG } from '../store/reducer';
import { createTournament, validateTournamentSetup } from '../domain/tournaments';
import type {
  MatchConfig,
  TournamentEntry,
  TournamentFormat,
} from '../domain/types';
import { useApp, useT } from '../store/AppContext';
import type { StringKey } from '../i18n/strings';

const courts = [1, 2, 3, 4] as const;

export function TournamentSetupScreen() {
  const { state, dispatch } = useApp();
  const { t } = useT();
  const [name, setName] = useState('');
  const [format, setFormat] = useState<TournamentFormat>('rr');
  const [config, setConfigState] = useState<MatchConfig>({ ...DEFAULT_CONFIG, type: 's' });
  const [courtCount, setCourtCount] = useState<number>(2);
  const [singles, setSingles] = useState<string[]>([]);
  const [teams, setTeams] = useState<TournamentEntry[]>([]);
  const [firstDoublesPlayer, setFirstDoublesPlayer] = useState<string | null>(null);

  const entries = useMemo(() => {
    if (config.type === 'd') return teams;
    return singles.flatMap((id) => {
      const player = state.players.find((item) => item.id === id);
      return player
        ? [{ id: `entry-${id}`, playerIds: [id], names: [player.displayName] }]
        : [];
    });
  }, [config.type, singles, state.players, teams]);
  const validation = validateTournamentSetup({
    name,
    format,
    config,
    courts: courtCount,
    entries,
  });

  const setConfig = (patch: Partial<MatchConfig>) =>
    setConfigState((previous) => ({ ...previous, ...patch }));

  const resetParticipants = (type: MatchConfig['type']) => {
    if (config.type === type) return;
    setConfig({ type });
    setSingles([]);
    setTeams([]);
    setFirstDoublesPlayer(null);
  };

  const toggleSinglesPlayer = (id: string) => {
    setSingles((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const toggleDoublesPlayer = (id: string) => {
    if (teams.some((team) => team.playerIds.includes(id))) {
      setTeams((current) => current.filter((team) => !team.playerIds.includes(id)));
      return;
    }
    if (!firstDoublesPlayer) {
      setFirstDoublesPlayer(id);
      return;
    }
    if (firstDoublesPlayer === id) {
      setFirstDoublesPlayer(null);
      return;
    }
    const first = state.players.find((player) => player.id === firstDoublesPlayer);
    const second = state.players.find((player) => player.id === id);
    if (!first || !second) return;
    setTeams((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        playerIds: [first.id, second.id],
        names: [first.displayName, second.displayName],
      },
    ]);
    setFirstDoublesPlayer(null);
  };

  const errorKey: StringKey | null = validation
    ? ({
        nameRequired: 'tournamentErrorName',
        needParticipants: 'tournamentErrorParticipants',
        invalidCourts: 'tournamentErrorCourts',
        invalidEntry: 'tournamentErrorPair',
        duplicateEntry: 'tournamentErrorDuplicates',
        duplicatePlayer: 'tournamentErrorDuplicates',
      } satisfies Record<NonNullable<typeof validation>, StringKey>)[validation]
    : null;

  const generate = () => {
    if (validation) return;
    dispatch({
      type: 'CREATE_TOURNAMENT',
      tournament: createTournament({
        name,
        format,
        config,
        courts: courtCount,
        entries,
      }),
    });
  };

  const count = entries.length;
  const matches = format === 'rr' ? (count * (count - 1)) / 2 : Math.max(0, count - 1);
  let bracketSize = 2;
  while (bracketSize < count) bracketSize *= 2;
  const byeCount = format === 'rr' ? (count % 2 ? count : 0) : Math.max(0, bracketSize - count);

  return (
    <div className="sc">
      <ScreenHeader title={t('newTournament')} back="tournaments" />

      <div>
        <p className="mt">{t('tournamentName')}</p>
        <input
          type="text"
          value={name}
          placeholder={t('tournamentNameHint')}
          aria-label={t('tournamentName')}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div>
        <p className="mt">{t('tournamentFormat')}</p>
        <Segmented
          value={format}
          onChange={setFormat}
          options={[
            { value: 'rr', label: t('roundRobin') },
            { value: 'se', label: t('singleElimination') },
          ]}
        />
      </div>

      <div>
        <p className="mt">{t('type')}</p>
        <Segmented
          value={config.type}
          onChange={resetParticipants}
          options={[
            { value: 's', label: t('s') },
            { value: 'd', label: t('d') },
          ]}
        />
      </div>

      <div>
        <p className="mt">{t('mode')}</p>
        <Segmented
          value={config.mode}
          onChange={(mode) => setConfig({ mode })}
          options={[
            { value: 'trad', label: t('trad') },
            { value: 'rally', label: t('rally') },
          ]}
        />
        {config.mode === 'rally' && (
          <p className="warn" style={{ marginTop: 8 }}>
            {t('rnote')}
          </p>
        )}
      </div>

      <div>
        <p className="mt">{t('fmt')}</p>
        <Segmented
          value={config.fmt}
          onChange={(fmt) => setConfig({ fmt })}
          options={[
            { value: 's', label: t('one') },
            { value: 'b3', label: t('b3') },
          ]}
        />
      </div>

      <div>
        <p className="mt">{t('target')}</p>
        <Segmented
          value={config.target}
          onChange={(target) => setConfig({ target })}
          options={[
            { value: 11, label: '11' },
            { value: 15, label: '15' },
            { value: 21, label: '21' },
          ]}
        />
      </div>

      <div>
        <p className="mt">{t('win')}</p>
        <Segmented
          value={config.winBy}
          onChange={(winBy) => setConfig({ winBy })}
          options={[
            { value: 2, label: t('w2') },
            { value: 1, label: t('w1') },
          ]}
        />
        {config.winBy === 1 && (
          <p className="warn" style={{ marginTop: 8 }}>
            {t('cust')}
          </p>
        )}
      </div>

      <div>
        <p className="mt">{t('courts')}</p>
        <Segmented
          value={courtCount}
          onChange={setCourtCount}
          options={courts.map((value) => ({ value, label: String(value) }))}
        />
      </div>

      <div>
        <p className="mt">
          {t('participants')} ({count})
        </p>
        {!state.players.length ? (
          <div className="card">
            <p className="mt">{t('noTournamentPlayers')}</p>
            <button type="button" onClick={() => dispatch({ type: 'NAVIGATE', view: 'roster' })}>
              {t('pl')}
            </button>
          </div>
        ) : config.type === 's' ? (
          <div className="seg p">
            {state.players.map((player) => {
              const selected = singles.includes(player.id);
              return (
                <button
                  type="button"
                  key={player.id}
                  className={selected ? 'on' : ''}
                  aria-pressed={selected}
                  onClick={() => toggleSinglesPlayer(player.id)}
                >
                  {player.displayName}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <p className="mt">{t('doublesPairHelp')}</p>
            <div className="seg p">
              {state.players
                .filter(
                  (player) =>
                    !teams.some((team) => team.playerIds.includes(player.id)) ||
                    player.id === firstDoublesPlayer,
                )
                .map((player) => {
                  const selected = player.id === firstDoublesPlayer;
                  return (
                    <button
                      type="button"
                      key={player.id}
                      className={selected ? 'on' : ''}
                      aria-pressed={selected}
                      onClick={() => toggleDoublesPlayer(player.id)}
                    >
                      {player.displayName}
                    </button>
                  );
                })}
            </div>
            {firstDoublesPlayer && (
              <p className="mt" role="status">
                {t('selectPartnerFirst')}
              </p>
            )}
            {teams.map((team) => (
              <button
                type="button"
                className="mc"
                key={team.id}
                onClick={() => setTeams((current) => current.filter((item) => item.id !== team.id))}
                aria-label={`${team.names.join(' / ')} · ${t('remove')}`}
              >
                <b>{team.names.join(' / ')}</b>
                <span className="tag">{t('remove')}</span>
              </button>
            ))}
          </>
        )}
      </div>

      {errorKey ? (
        <p className="err" role="alert">
          {t(errorKey)}
        </p>
      ) : (
        <p className="mt">
          {matches} {t('tournamentCount')}
          {byeCount ? ` · ${byeCount} ${t('byes')}` : ''}
        </p>
      )}
      <button type="button" className="b" disabled={Boolean(validation)} onClick={generate}>
        {t('generateSchedule')}
      </button>
    </div>
  );
}
