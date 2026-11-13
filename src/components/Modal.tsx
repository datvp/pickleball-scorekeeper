import { useApp, useT } from '../store/AppContext';

export function ConfirmModal() {
  const { state, dispatch } = useApp();
  const { t } = useT();
  if (!state.modal) return null;

  const question = state.modal === 'end' ? t('endq') : t('clearq');
  const confirm = () =>
    dispatch({ type: state.modal === 'end' ? 'END_MATCH' : 'CLEAR_ALL' });

  return (
    <div className="ov" role="dialog" aria-modal="true">
      <div className="card">
        <p>{question}</p>
        <div className="row">
          <button
            type="button"
            style={{ flex: 1 }}
            onClick={() => dispatch({ type: 'SET_MODAL', modal: null })}
          >
            {t('no')}
          </button>
          <button
            type="button"
            className="b"
            style={{ flex: 1, minHeight: 48, fontSize: 16 }}
            onClick={confirm}
          >
            {t('yes')}
          </button>
        </div>
      </div>
    </div>
  );
}
