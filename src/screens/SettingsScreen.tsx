import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { useApp, useT } from '../store/AppContext';
import type { ToggleKey } from '../store/reducer';

export function SettingsScreen() {
  const { state, dispatch } = useApp();
  const { t } = useT();
  const { settings } = state;

  const toggle = (key: ToggleKey, label: string) => {
    const on = settings[key];
    return (
      <div className="card row sp">
        <span>{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          className={on ? 'on' : ''}
          style={{
            minWidth: 80,
            ...(on ? { background: 'var(--pr)', color: 'var(--pt)' } : {}),
          }}
          onClick={() => dispatch({ type: 'TOGGLE', key })}
        >
          {t(on ? 'on' : 'off')}
        </button>
      </div>
    );
  };

  return (
    <div className="sc">
      <ScreenHeader title={t('set')} back="home" />
      <div>
        <p className="mt">{t('lang')}</p>
        <Segmented
          value={settings.lang}
          onChange={(lang) => dispatch({ type: 'SET_LANG', lang })}
          options={[
            { value: 'vi', label: 'Tiếng Việt' },
            { value: 'en', label: 'English' },
          ]}
        />
      </div>
      <div>
        <p className="mt">{t('theme')}</p>
        <Segmented
          value={settings.theme}
          onChange={(theme) => dispatch({ type: 'SET_THEME', theme })}
          options={[
            { value: 'light', label: t('light') },
            { value: 'dark', label: t('dark') },
            { value: 'outdoor', label: t('out') },
          ]}
        />
      </div>
      {toggle('keepAwake', t('keep'))}
      {toggle('haptics', t('hap'))}
      <button
        type="button"
        style={{ color: 'var(--er)', borderColor: 'var(--er)' }}
        onClick={() => dispatch({ type: 'SET_MODAL', modal: 'clear' })}
      >
        {t('clear')}
      </button>
    </div>
  );
}
