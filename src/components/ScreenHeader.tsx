import { useApp, useT } from '../store/AppContext';
import type { View } from '../store/reducer';

export function ScreenHeader({ title, back }: { title: string; back: View }) {
  const { dispatch } = useApp();
  const { t } = useT();
  return (
    <div className="row sp">
      <button
        type="button"
        className="ic"
        aria-label={t('back')}
        onClick={() => dispatch({ type: 'NAVIGATE', view: back })}
      >
        ‹
      </button>
      <h2>{title}</h2>
      <span style={{ width: 48 }} />
    </div>
  );
}
