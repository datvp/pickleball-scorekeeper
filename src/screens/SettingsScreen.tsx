import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { useAuth, type AuthErrorKey } from '../auth/AuthProvider';
import { useApp, useT } from '../store/AppContext';
import type { ToggleKey } from '../store/reducer';

type AuthMode = 'signin' | 'signup';
type SignInMethod = 'password' | 'otp';

export function SettingsScreen() {
  const { state, dispatch } = useApp();
  const { t } = useT();
  const {
    client,
    session,
    loading,
    pendingEmail,
    error,
    authErrorCode,
    notice,
    clearMessage,
    signUpWithPassword,
    signInWithPassword,
    sendEmailCode,
    verifyEmailCode,
    signOut,
    reviewProfileLink,
  } = useAuth();
  const { settings } = state;
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [signInMethod, setSignInMethod] = useState<SignInMethod>('password');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [code, setCode] = useState('');
  const [formError, setFormError] = useState<AuthErrorKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkRequests, setLinkRequests] = useState<
    { request_id: string; is_own_request: boolean; player_name_snapshot: string; created_at: string }[]
  >([]);
  const [linkRequestsError, setLinkRequestsError] = useState(false);

  const loadLinkRequests = useCallback(async () => {
    if (!client || !session) {
      setLinkRequests([]);
      setLinkRequestsError(false);
      return;
    }
    try {
      const { data, error: requestError } = await client
        .from('pending_player_profile_link_requests')
        .select('request_id, is_own_request, player_name_snapshot, created_at')
        .order('created_at', { ascending: true });
      if (requestError) {
        setLinkRequestsError(true);
        return;
      }
      setLinkRequestsError(false);
      setLinkRequests(data ?? []);
    } catch {
      setLinkRequestsError(true);
    }
  }, [client, session?.user.id]);

  useEffect(() => {
    void loadLinkRequests();
  }, [loadLinkRequests]);

  const handlePasswordSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearMessage();
    setFormError(null);
    setBusy(true);
    const signedIn = await signInWithPassword(email, password);
    setBusy(false);
    if (signedIn) setPassword('');
  };

  const handleSendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearMessage();
    setFormError(null);
    if (!email.trim()) {
      setFormError('authRequestFailed');
      return;
    }
    setBusy(true);
    await sendEmailCode(email);
    setBusy(false);
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearMessage();
    setFormError(null);
    if (!/^[A-Za-z0-9_]{3,30}$/.test(username.trim())) {
      setFormError('authUsernameInvalid');
      return;
    }
    if (password.length < 8) {
      setFormError('authPasswordTooShort');
      return;
    }
    if (password !== passwordConfirmation) {
      setFormError('authPasswordMismatch');
      return;
    }

    setBusy(true);
    const signedUp = await signUpWithPassword(username, email, password);
    setBusy(false);
    if (signedUp) {
      setAuthMode('signin');
      setSignInMethod('password');
      setUsername('');
      setPassword('');
      setPasswordConfirmation('');
    }
  };

  const handleVerifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearMessage();
    setFormError(null);
    setBusy(true);
    const verified = await verifyEmailCode(code);
    setBusy(false);
    if (verified) setCode('');
  };

  const handleSignOut = async () => {
    clearMessage();
    setBusy(true);
    await signOut();
    setBusy(false);
  };

  const handleResendCode = async () => {
    if (!pendingEmail) return;
    clearMessage();
    setBusy(true);
    await sendEmailCode(pendingEmail);
    setBusy(false);
  };

  const handleReviewLink = async (id: string, approve: boolean) => {
    setBusy(true);
    const reviewed = await reviewProfileLink(id, approve);
    setBusy(false);
    if (reviewed) await loadLinkRequests();
  };

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
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <b>{session ? t('accountTitle') : t('guest')}</b>
        {loading ? (
          <p className="mt" role="status">{t('authLoading')}</p>
        ) : session ? (
          <>
            <p className="mt">{t('signedInAs')}: {session.user.email}</p>
            <p className="mt">{t('localDataKept')}</p>
            <button type="button" onClick={handleSignOut} disabled={busy}>
              {t('signOut')}
            </button>
            <div className="card">
              <b>{t('profileLinkRequests')}</b>
              {linkRequestsError ? (
                <p className="err" role="alert">{t('profileLinkLoadFailed')}</p>
              ) : linkRequests.length === 0 ? (
                <p className="mt">{t('noProfileLinkRequests')}</p>
              ) : (
                linkRequests.map((request) => (
                  <div className="gr" key={request.request_id}>
                    <span>{request.player_name_snapshot}</span>
                    {request.is_own_request ? (
                      <span className="mt">{t('linkRequestPending')}</span>
                    ) : (
                      <span className="row">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleReviewLink(request.request_id, true)}
                        >
                          {t('approve')}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleReviewLink(request.request_id, false)}
                        >
                          {t('reject')}
                        </button>
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <p className="mt">{t('guestD')}</p>
            <p className="mt">{t('localDataKept')}</p>
            {client ? (
              <>
                <div className="seg" role="group" aria-label={t('authMode')}>
                  <button
                    type="button"
                    aria-pressed={authMode === 'signin'}
                    disabled={busy}
                    onClick={() => {
                      clearMessage();
                      setFormError(null);
                      setAuthMode('signin');
                      setSignInMethod('password');
                      setUsername('');
                      setPassword('');
                      setPasswordConfirmation('');
                    }}
                  >
                    {t('signIn')}
                  </button>
                  <button
                    type="button"
                    aria-pressed={authMode === 'signup'}
                    disabled={busy}
                    onClick={() => {
                      clearMessage();
                      setFormError(null);
                      setAuthMode('signup');
                      setPassword('');
                      setPasswordConfirmation('');
                    }}
                  >
                    {t('signUp')}
                  </button>
                </div>
                {authMode === 'signup' ? (
                  <form
                    onSubmit={(event) => void handleSignUp(event)}
                    style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                  >
                    <label>
                      <span className="mt">{t('username')}</span>
                      <input
                        type="text"
                        autoComplete="username"
                        minLength={3}
                        maxLength={30}
                        pattern="[A-Za-z0-9_]{3,30}"
                        required
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                      />
                    </label>
                    <label>
                      <span className="mt">{t('email')}</span>
                      <input
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </label>
                    <label>
                      <span className="mt">{t('password')}</span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </label>
                    <label>
                      <span className="mt">{t('confirmPassword')}</span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        required
                        value={passwordConfirmation}
                        onChange={(event) => setPasswordConfirmation(event.target.value)}
                      />
                    </label>
                    <button type="submit" className="b" disabled={busy}>
                      {t('createAccount')}
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="seg" role="group" aria-label={t('authSignInMethod')}>
                      <button
                        type="button"
                        aria-pressed={signInMethod === 'password'}
                        disabled={busy}
                        onClick={() => {
                          clearMessage();
                          setFormError(null);
                          setSignInMethod('password');
                        }}
                      >
                        {t('emailPassword')}
                      </button>
                      <button
                        type="button"
                        aria-pressed={signInMethod === 'otp'}
                        disabled={busy}
                        onClick={() => {
                          clearMessage();
                          setFormError(null);
                          setSignInMethod('otp');
                        }}
                      >
                        {t('emailOtp')}
                      </button>
                    </div>
                    {signInMethod === 'password' ? (
                      <form
                        onSubmit={(event) => void handlePasswordSignIn(event)}
                        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                      >
                        <label>
                          <span className="mt">{t('email')}</span>
                          <input
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                          />
                        </label>
                        <label>
                          <span className="mt">{t('password')}</span>
                          <input
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                          />
                        </label>
                        <button type="submit" className="b" disabled={busy}>
                          {t('signIn')}
                        </button>
                      </form>
                    ) : (
                      <form
                        onSubmit={(event) => void handleSendCode(event)}
                        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                      >
                        <label>
                          <span className="mt">{t('email')}</span>
                          <input
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                          />
                        </label>
                        <button type="submit" className="b" disabled={busy || !email.trim()}>
                          {t('sendCode')}
                        </button>
                      </form>
                    )}
                  </>
                )}
                {authMode === 'signin' && signInMethod === 'otp' && pendingEmail && (
                  <form
                    onSubmit={(event) => void handleVerifyCode(event)}
                    style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                  >
                    <label>
                      <span className="mt">{t('otpCode')}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={8}
                        required
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                      />
                    </label>
                    <button type="submit" disabled={busy || !code.trim()}>
                      {t('verifyCode')}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleResendCode()}
                    >
                      {t('resendCode')}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <p className="warn" role="status">{t('authNotConfigured')}</p>
            )}
          </>
        )}
        {formError && <p className="err" role="alert">{t(formError)}</p>}
        {error && <p className="err" role="alert">{t(error)}</p>}
        {authErrorCode && (
          <p className="mt" role="status">
            {t('authErrorCode')}: <code>{authErrorCode}</code>
          </p>
        )}
        {notice && <p className="mt" role="status">{t(notice)}</p>}
      </div>
      <div>
        <p className="mt">{t('theme')}</p>
        <Segmented
          value={settings.theme}
          onChange={(theme) => dispatch({ type: 'SET_THEME', theme })}
          options={[
            { value: 'soft-sage', label: t('softSage') },
            { value: 'blush', label: t('blush') },
            { value: 'linen', label: t('linen') },
            { value: 'taupe', label: t('taupe') },
            { value: 'deep-sage', label: t('deepSage') },
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
