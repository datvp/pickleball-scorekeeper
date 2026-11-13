import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { defaultLabel, hasDuplicateNames, resolveTeams } from '../domain/players';
import { useApp, useT } from '../store/AppContext';

export function PlayersSetupScreen() {
  const { state, dispatch } = useApp();
  const { t } = useT();
  const doubles = state.cfg.type === 'd';
  const duplicate = hasDuplicateNames(state.cfg.type, state.names);

  const field = (slot: number) => {
    const label = defaultLabel(t('pln'), slot);
    return (
      <input
        key={slot}
        value={state.names[slot] ?? ''}
        placeholder={label}
        aria-label={label}
        onChange={(e) => dispatch({ type: 'SET_NAME', slot, value: e.target.value })}
      />
    );
  };
  const fields = (slots: number[]) =>
    slots.map((s, i) => (
      <div key={s} style={i ? { marginTop: 8 } : undefined}>
        {field(s)}
      </div>
    ));

  const start = () => {
    if (duplicate) return;
    dispatch({
      type: 'START_MATCH',
      names: resolveTeams(state.cfg.type, state.names, t('pln')),
    });
  };

  return (
    <div className="sc">
      <ScreenHeader title={t('pl')} back="setup" />
      <p className="mt">{t('ptn')}</p>

      <div className="card" style={{ borderColor: 'var(--ta)' }}>
        <b style={{ color: 'var(--ta)' }}>{t('teamA')}</b>
        {fields(doubles ? [0, 1] : [0])}
      </div>
      <div className="card" style={{ borderColor: 'var(--tb)' }}>
        <b style={{ color: 'var(--tb)' }}>{t('teamB')}</b>
        {fields(doubles ? [2, 3] : [2])}
      </div>

      <div>
        <p className="mt">{t('first')}</p>
        <Segmented
          value={state.firstServer}
          onChange={(team) => dispatch({ type: 'SET_FIRST_SERVER', team })}
          options={[
            { value: 0, label: t('teamA') },
            { value: 1, label: t('teamB') },
          ]}
        />
      </div>

      {duplicate && (
        <p className="err" role="alert">
          {t('dup')}
        </p>
      )}
      <button
        type="button"
        className="b"
        style={{ marginTop: 'auto' }}
        disabled={duplicate}
        onClick={start}
      >
        {t('start')}
      </button>
    </div>
  );
}
