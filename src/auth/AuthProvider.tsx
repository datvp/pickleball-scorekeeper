import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authRedirectUrl, supabase } from './supabase';

export type AuthErrorKey =
  | 'authNotConfigured'
  | 'authRequestFailed'
  | 'authVerificationFailed'
  | 'authSignUpFailed'
  | 'authPasswordSignInFailed'
  | 'authUsernameTaken'
  | 'authUsernameInvalid'
  | 'authPasswordTooShort'
  | 'authPasswordMismatch'
  | 'authSignOutFailed'
  | 'authCallbackFailed'
  | 'profileLinkFailed';

export type AuthNoticeKey =
  | 'authCodeSent'
  | 'authOpeningProvider'
  | 'authSignupCheckEmail'
  | 'authSignupComplete';

interface AuthContextValue {
  client: typeof supabase;
  session: Session | null;
  loading: boolean;
  pendingEmail: string | null;
  linkedPlayerProfileId: string | null;
  error: AuthErrorKey | null;
  authErrorCode: string | null;
  notice: AuthNoticeKey | null;
  clearMessage: () => void;
  signUpWithPassword: (username: string, email: string, password: string) => Promise<boolean>;
  signInWithPassword: (email: string, password: string) => Promise<boolean>;
  sendEmailCode: (email: string) => Promise<boolean>;
  verifyEmailCode: (code: string) => Promise<boolean>;
  signInWithProvider: (provider: 'google' | 'apple') => Promise<boolean>;
  signOut: () => Promise<boolean>;
  requestProfileLink: (profileId: string) => Promise<boolean>;
  reviewProfileLink: (requestId: string, approve: boolean) => Promise<boolean>;
}

const unavailable: AuthContextValue = {
  client: null,
  session: null,
  loading: false,
  pendingEmail: null,
  linkedPlayerProfileId: null,
  error: null,
  authErrorCode: null,
  notice: null,
  clearMessage: () => undefined,
  signUpWithPassword: async () => false,
  signInWithPassword: async () => false,
  sendEmailCode: async () => false,
  verifyEmailCode: async () => false,
  signInWithProvider: async () => false,
  signOut: async () => false,
  requestProfileLink: async () => false,
  reviewProfileLink: async () => false,
};

const AuthContext = createContext<AuthContextValue>(unavailable);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [linkedPlayerProfileId, setLinkedPlayerProfileId] = useState<string | null>(null);
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<AuthNoticeKey | null>(null);

  const refreshLinkedProfile = useCallback(
    async (nextSession: Session | null) => {
      if (!supabase || !nextSession) {
        setLinkedPlayerProfileId(null);
        return;
      }

      try {
        const { data, error: queryError } = await supabase
          .from('player_profiles')
          .select('id')
          .eq('linked_account_id', nextSession.user.id)
          .maybeSingle();
        if (queryError) {
          setError('profileLinkFailed');
          return;
        }
        setLinkedPlayerProfileId(data?.id ?? null);
      } catch {
        setError('profileLinkFailed');
      }
    },
    [],
  );

  useEffect(() => {
    if (!supabase) return;
    const authClient = supabase;
    let active = true;
    let urlListener: { remove: () => Promise<void> } | undefined;
    let processedCallback: string | null = null;

    const handleUrl = async (url: string) => {
      if (!url.startsWith('pickleballscorekeeper://auth/callback')) return;
      if (processedCallback === url) return;
      processedCallback = url;
      try {
        const callback = new URL(url);
        const callbackError = callback.searchParams.get('error_description');
        if (callbackError || callback.searchParams.has('error')) {
          setError('authCallbackFailed');
          setLoading(false);
          return;
        }
        const code = callback.searchParams.get('code');
        if (!code) {
          setError('authCallbackFailed');
          setLoading(false);
          return;
        }
        const { error: exchangeError } = await authClient.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError('authCallbackFailed');
          setLoading(false);
        }
      } catch {
        setError('authCallbackFailed');
        setLoading(false);
      }
    };

    const { data } = authClient.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setLoading(false);
      window.setTimeout(() => {
        if (active) void refreshLinkedProfile(nextSession);
      }, 0);
    });

    void authClient.auth
      .getSession()
      .then(({ data: sessionData, error: sessionError }) => {
        if (!active) return;
        if (sessionError) setError('authRequestFailed');
        setSession(sessionData.session);
        setLoading(false);
        void refreshLinkedProfile(sessionData.session);
      })
      .catch(() => {
        if (!active) return;
        setError('authRequestFailed');
        setLoading(false);
      });

    if (Capacitor.isNativePlatform()) {
      void App.addListener('appUrlOpen', ({ url }) => {
        void handleUrl(url);
      })
        .then((listener) => {
          if (active) urlListener = listener;
          else void listener.remove();
        })
        .catch(() => {
          if (!active) return;
          setError('authCallbackFailed');
          setLoading(false);
        });
      void App.getLaunchUrl()
        .then((launch) => {
          if (launch?.url) return handleUrl(launch.url);
        })
        .catch(() => {
          if (!active) return;
          setError('authCallbackFailed');
          setLoading(false);
        });
    }

    return () => {
      active = false;
      data.subscription.unsubscribe();
      if (urlListener) void urlListener.remove();
    };
  }, [refreshLinkedProfile]);

  const clearMessage = useCallback(() => {
    setError(null);
    setAuthErrorCode(null);
    setNotice(null);
  }, []);

  const signUpWithPassword = useCallback(async (username: string, rawEmail: string, password: string) => {
    if (!supabase) {
      setError('authNotConfigured');
      return false;
    }
    setError(null);
    setNotice(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: rawEmail.trim(),
        password,
        options: {
          data: { username: username.trim() },
          emailRedirectTo: authRedirectUrl(),
        },
      });
      if (signUpError) {
        const message = signUpError.message.toLowerCase();
        setError(
          message.includes('account_profiles_username_ci_key') || message.includes('duplicate key')
            ? 'authUsernameTaken'
            : 'authSignUpFailed',
        );
        return false;
      }
      if (!data.user) {
        setError('authSignUpFailed');
        return false;
      }
      setNotice(data.session ? 'authSignupComplete' : 'authSignupCheckEmail');
      return true;
    } catch {
      setError('authSignUpFailed');
      return false;
    }
  }, []);

  const signInWithPassword = useCallback(async (rawEmail: string, password: string) => {
    if (!supabase) {
      setError('authNotConfigured');
      return false;
    }
    setError(null);
    setNotice(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: rawEmail.trim(),
        password,
      });
      if (signInError) {
        setError('authPasswordSignInFailed');
        return false;
      }
      return true;
    } catch {
      setError('authPasswordSignInFailed');
      return false;
    }
  }, []);

  const sendEmailCode = useCallback(async (rawEmail: string) => {
    if (!supabase) {
      setError('authNotConfigured');
      return false;
    }
    const email = rawEmail.trim();
    if (!email) {
      setError('authRequestFailed');
      return false;
    }
    setError(null);
    setAuthErrorCode(null);
    setNotice(null);
    try {
      const { error: requestError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: authRedirectUrl() },
      });
      if (requestError) {
        setError('authRequestFailed');
        setAuthErrorCode(
          typeof requestError.code === 'string' && /^[a-z0-9_]{1,64}$/.test(requestError.code)
            ? requestError.code
            : null,
        );
        return false;
      }
    } catch {
      setError('authRequestFailed');
      return false;
    }
    setPendingEmail(email);
    setNotice('authCodeSent');
    return true;
  }, []);

  const verifyEmailCode = useCallback(
    async (code: string) => {
      if (!supabase || !pendingEmail) {
        setError('authVerificationFailed');
        return false;
      }
      setError(null);
      setNotice(null);
      try {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: pendingEmail,
          token: code.trim(),
          type: 'email',
        });
        if (verifyError) {
          setError('authVerificationFailed');
          return false;
        }
      } catch {
        setError('authVerificationFailed');
        return false;
      }
      setPendingEmail(null);
      return true;
    },
    [pendingEmail],
  );

  const signInWithProvider = useCallback(async (provider: 'google' | 'apple') => {
    if (!supabase) {
      setError('authNotConfigured');
      return false;
    }
    setError(null);
    setNotice(null);
    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: authRedirectUrl(),
          skipBrowserRedirect: true,
        },
      });
      if (oauthError || !data.url) {
        setError('authRequestFailed');
        return false;
      }
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: data.url });
      } else {
        window.location.assign(data.url);
      }
      setNotice('authOpeningProvider');
      return true;
    } catch {
      setError('authRequestFailed');
      return false;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return false;
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError('authSignOutFailed');
        return false;
      }
    } catch {
      setError('authSignOutFailed');
      return false;
    }
    setPendingEmail(null);
    setNotice(null);
    return true;
  }, []);

  const requestProfileLink = useCallback(async (profileId: string) => {
    if (!supabase) {
      setError('authNotConfigured');
      return false;
    }
    setError(null);
    try {
      const { error: requestError } = await supabase.rpc('request_player_profile_link', {
        requested_profile_id: profileId,
      });
      if (requestError) {
        setError('profileLinkFailed');
        return false;
      }
    } catch {
      setError('profileLinkFailed');
      return false;
    }
    return true;
  }, []);

  const reviewProfileLink = useCallback(async (requestId: string, approve: boolean) => {
    if (!supabase) {
      setError('authNotConfigured');
      return false;
    }
    setError(null);
    const functionName = approve ? 'approve_player_profile_link' : 'reject_player_profile_link';
    try {
      const { error: reviewError } = await supabase.rpc(functionName, {
        link_request_id: requestId,
      });
      if (reviewError) {
        setError('profileLinkFailed');
        return false;
      }
    } catch {
      setError('profileLinkFailed');
      return false;
    }
    return true;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      client: supabase,
      session,
      loading,
      pendingEmail,
      linkedPlayerProfileId,
      error,
      notice,
      clearMessage,
      authErrorCode,
      signUpWithPassword,
      signInWithPassword,
      sendEmailCode,
      verifyEmailCode,
      signInWithProvider,
      signOut,
      requestProfileLink,
      reviewProfileLink,
    }),
    [
      session,
      loading,
      pendingEmail,
      linkedPlayerProfileId,
      error,
      authErrorCode,
      notice,
      clearMessage,
      signUpWithPassword,
      signInWithPassword,
      sendEmailCode,
      verifyEmailCode,
      signInWithProvider,
      signOut,
      requestProfileLink,
      reviewProfileLink,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
