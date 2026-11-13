import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { useApp, useT } from '../store/AppContext';

export function SetupScreen() {
  const { state, dispatch } = useApp();
  const { t } = useT();
  const c = state.cfg;
  const set = (patch: Partial<typeof c>) => dispatch({ type: 'SET_CONFIG', patch });

  return (
    <div className="sc">
      <ScreenHeader title={t('quick')} back="home" />

      <div>
        <p className="mt">{t('type')}</p>
        <Segmented
          value={c.type}
          onChange={(type) => set({ type })}
          options={[
            { value: 's', label: t('s') },
            { value: 'd', label: t('d') },
          ]}
        />
      </div>

      <div>
        <p className="mt">{t('mode')}</p>
        <Segmented
          value={c.mode}
          onChange={(mode) => set({ mode })}
          options={[
            { value: 'trad', label: t('trad') },
            { value: 'rally', label: t('rally') },
          ]}
        />
        {c.mode === 'rally' && (
          <p className="warn" style={{ marginTop: 8 }}>
            {t('rnote')}
          </p>
        )}
      </div>

      <div>
        <p className="mt">{t('fmt')}</p>
        <Segmented
          value={c.fmt}
          onChange={(fmt) => set({ fmt })}
          options={[
            { value: 's', label: t('one') },
            { value: 'b3', label: t('b3') },
          ]}
        />
      </div>

      <div>
        <p className="mt">{t('target')}</p>
        <Segmented
          value={c.target}
          onChange={(target) => set({ target })}
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
          value={c.winBy}
          onChange={(winBy) => set({ winBy })}
          options={[
            { value: 2, label: t('w2') },
            { value: 1, label: t('w1') },
          ]}
        />
        {c.winBy === 1 && (
          <p className="warn" style={{ marginTop: 8 }}>
            {t('cust')}
          </p>
        )}
      </div>

      <button
        type="button"
        className="b"
        style={{ marginTop: 'auto' }}
        onClick={() => dispatch({ type: 'NAVIGATE', view: 'setupPlayers' })}
      >
        {t('next')}
      </button>
    </div>
  );
}
