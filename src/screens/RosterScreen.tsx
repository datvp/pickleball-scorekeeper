import { useState, type FormEvent } from 'react';
import { createPlayerProfile, isDuplicatePlayerName, playerStats } from '../domain/players';
import { useApp, useT } from '../store/AppContext';

export function RosterScreen() {
  const { state, dispatch } = useApp();
  const { t } = useT();
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const players = state.players.filter((player) =>
    player.displayName.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const addPlayer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const displayName = name.trim();
    if (!displayName) {
      setError(t('playerNameRequired'));
      return;
    }
    if (isDuplicatePlayerName(state.players, displayName)) {
      setError(t('playerNameDuplicate'));
      return;
    }
    dispatch({ type: 'ADD_PLAYER', player: createPlayerProfile(displayName) });
    setName('');
    setError('');
  };

  return (
    <div className="sc">
      <h1>{t('pl')}</h1>
      <input
        type="search"
        value={query}
        placeholder={t('searchPlayers')}
        aria-label={t('searchPlayers')}
        onChange={(event) => setQuery(event.target.value)}
      />
      {players.length ? (
        players.map((player) => {
          const stats = playerStats(state.history, player);
          return (
            <button
              type="button"
              className="mc"
              key={player.id}
              onClick={() => dispatch({ type: 'OPEN_PLAYER', id: player.id })}
            >
              <span>
                <b>{player.displayName}</b>
                <br />
                <span className="mt">
                  {t('lvl')} {player.level} · {stats.matches} {t('played').toLowerCase()}
                </span>
              </span>
              <span className="tag">{t('unclaimed')}</span>
            </button>
          );
        })
      ) : (
        <div className="card">
          <b>{query ? t('noPlayersFound') : t('none')}</b>
          <p className="mt">{query ? t('noPlayersFoundHint') : t('noPlayersHint')}</p>
        </div>
      )}
      <form
        className="card"
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        onSubmit={addPlayer}
      >
        <b>{t('addP')}</b>
        <input
          type="text"
          value={name}
          placeholder={t('addPh')}
          aria-label={t('addPh')}
          onChange={(event) => {
            setName(event.target.value);
            setError('');
          }}
        />
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
        <button type="submit">{t('add')}</button>
      </form>
    </div>
  );
}
