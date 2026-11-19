import { useEffect, useState, type FormEvent } from 'react';
import { MatchCard } from '../components/MatchCard';
import { Segmented } from '../components/Segmented';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../auth/AuthProvider';
import {
  isDuplicatePlayerName,
  isPlayerInMatch,
  playerStats,
  winRate,
} from '../domain/players';
import { useApp, useT } from '../store/AppContext';

export function PlayerProfileScreen() {
  const { state, dispatch } = useApp();
  const { t } = useT();
  const { client, session, linkedPlayerProfileId, requestProfileLink } = useAuth();
  const player = state.players.find((item) => item.id === state.selectedPlayerId);
  const [name, setName] = useState(player?.displayName ?? '');
  const [level, setLevel] = useState(player?.level ?? '');
  const [visibility, setVisibility] = useState(player?.visibility ?? 'private');
  const [error, setError] = useState('');
  const [linkRequestSent, setLinkRequestSent] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setName(player?.displayName ?? '');
    setLevel(player?.level ?? '');
    setVisibility(player?.visibility ?? 'private');
    setError('');
    setLinkRequestSent(false);
  }, [player?.id, player?.displayName, player?.level, player?.visibility]);

  if (!player) return null;

  const stats = playerStats(state.history, player);
  const matches = state.history
    .map((match, index) => ({ match, index }))
    .filter(({ match }) => isPlayerInMatch(player, match.names, match.playerIds));
  const tournaments = state.tournaments.filter((tournament) =>
    tournament.entries.some((entry) => entry.playerIds.includes(player.id)),
  );

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const displayName = name.trim();
    if (!displayName) {
      setError(t('playerNameRequired'));
      return;
    }
    if (isDuplicatePlayerName(state.players, displayName, player.id)) {
      setError(t('playerNameDuplicate'));
      return;
    }
    if (!level.trim()) {
      setError(t('playerLevelRequired'));
      return;
    }

    setBusy(true);
    if (client && session && linkedPlayerProfileId === player.id) {
      try {
        const { data, error: updateError } = await client
          .from('player_profiles')
          .update({
            display_name: displayName,
            level: level.trim(),
            visibility,
            updated_at: new Date().toISOString(),
          })
          .eq('id', player.id)
          .select('id')
          .maybeSingle();
        if (updateError || !data) {
          setError(t('profileSaveFailed'));
          setBusy(false);
          return;
        }
      } catch {
        setError(t('profileSaveFailed'));
        setBusy(false);
        return;
      }
    }
    dispatch({
      type: 'UPDATE_PLAYER',
      id: player.id,
      displayName,
      level,
      visibility,
      now: Date.now(),
    });
    setError('');
    setBusy(false);
  };

  const requestLink = async () => {
    setBusy(true);
    const sent = await requestProfileLink(player.id);
    setLinkRequestSent(sent);
    setError(sent ? '' : t('profileLinkFailed'));
    setBusy(false);
  };

  return (
    <div className="sc">
      <ScreenHeader title={player.displayName} back="roster" />
      <div className="card">
        <div className="row sp">
          <b>{player.displayName}</b>
          <span className="tag">
            {linkedPlayerProfileId === player.id ? t('linkedAccount') : t('unclaimed')}
          </span>
        </div>
        <p className="mt" style={{ marginTop: 6 }}>
          {t('lvl')} {player.level} · {t(player.visibility === 'tournament' ? 'tournamentVisibility' : 'privateVisibility')}
        </p>
      </div>

      <form
        className="card"
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        onSubmit={(event) => void saveProfile(event)}
      >
        <b>{t('editPlayer')}</b>
        <input
          type="text"
          value={name}
          aria-label={t('addPh')}
          onChange={(event) => {
            setName(event.target.value);
            setError('');
          }}
        />
        <label>
          <span className="mt">{t('playerLevel')}</span>
          <input
            type="text"
            value={level}
            aria-label={t('playerLevel')}
            onChange={(event) => {
              setLevel(event.target.value);
              setError('');
            }}
          />
        </label>
        <span className="mt">{t('profileVisibility')}</span>
        <Segmented
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: 'private', label: t('privateVisibility') },
            { value: 'tournament', label: t('tournamentVisibility') },
          ]}
        />
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy}>{t('saveName')}</button>
      </form>
      {session && !linkedPlayerProfileId && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" disabled={busy || linkRequestSent} onClick={() => void requestLink()}>
            {t('requestProfileLink')}
          </button>
          {linkRequestSent && <p className="mt" role="status">{t('linkRequestPending')}</p>}
        </div>
      )}

      <div className="card">
        <div className="gr">
          <span>{t('played')}</span>
          <b>{stats.matches || '—'}</b>
        </div>
        <div className="gr">
          <span>{t('wins')}</span>
          <b>{stats.matches ? stats.wins : '—'}</b>
        </div>
        <div className="gr" style={{ border: 0 }}>
          <span>{t('wr')}</span>
          <b>{stats.matches ? `${winRate(stats)}%` : '—'}</b>
        </div>
      </div>

      <div className="card">
        <b>{t('matchHistory')}</b>
        {matches.length ? (
          matches.map(({ match, index }) => <MatchCard key={match.id} match={match} index={index} />)
        ) : (
          <p className="mt" style={{ marginTop: 8 }}>
            {t('none')}
          </p>
        )}
      </div>

      <div className="card">
        <b>{t('tours')}</b>
        {tournaments.length ? (
          tournaments.map((tournament) => (
            <button
              type="button"
              className="mc"
              key={tournament.id}
              onClick={() => dispatch({ type: 'OPEN_TOURNAMENT', id: tournament.id })}
            >
              <span>{tournament.name}</span>
              <span className="tag">{t(tournament.status)}</span>
            </button>
          ))
        ) : (
          <p className="mt" style={{ marginTop: 8 }}>
            {t('noTournamentHistory')}
          </p>
        )}
      </div>
    </div>
  );
}
