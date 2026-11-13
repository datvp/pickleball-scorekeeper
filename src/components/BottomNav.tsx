import { useApp, useT } from '../store/AppContext';
import type { StringKey } from '../i18n/strings';
import type { View } from '../store/reducer';

const TABS: { view: View; label: StringKey; icon: string }[] = [
  { view: 'home', label: 'home', icon: '⌂' },
  { view: 'history', label: 'hist', icon: '☰' },
  { view: 'roster', label: 'pl', icon: '☺' },
  { view: 'stats', label: 'st', icon: '▥' },
];

export const NAV_VIEWS: View[] = ['home', 'history', 'roster', 'stats', 'detail', 'settings'];

export function BottomNav() {
  const { state, dispatch } = useApp();
  const { t } = useT();
  const active: View =
    state.view === 'detail' ? 'history' : state.view === 'settings' ? 'home' : state.view;

  return (
    <nav className="nav">
      {TABS.map((tab) => (
        <button
          key={tab.view}
          type="button"
          className={active === tab.view ? 'on' : ''}
          onClick={() => dispatch({ type: 'NAVIGATE', view: tab.view })}
        >
          <span style={{ fontSize: 20, display: 'block' }}>{tab.icon}</span>
          {t(tab.label)}
        </button>
      ))}
    </nav>
  );
}
