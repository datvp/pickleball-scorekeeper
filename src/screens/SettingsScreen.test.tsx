import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SettingsScreen } from './SettingsScreen';
import { AppContext } from '../store/AppContext';
import { createInitialState } from '../store/reducer';

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));

vi.mock('../auth/AuthProvider', () => ({ useAuth: useAuthMock }));

describe('settings account controls', () => {
  it('offers separate email/password and OTP sign-in modes without OAuth buttons', () => {
    useAuthMock.mockReturnValue({
      client: {},
      session: null,
      loading: false,
      pendingEmail: null,
      linkedPlayerProfileId: null,
      error: null,
      authErrorCode: null,
      notice: null,
      clearMessage: () => undefined,
      signUpWithPassword: async () => true,
      signInWithPassword: async () => true,
      sendEmailCode: async () => true,
      verifyEmailCode: async () => true,
      signOut: async () => true,
      reviewProfileLink: async () => true,
    });

    const html = renderToString(
      <AppContext.Provider value={{ state: createInitialState(), dispatch: () => undefined }}>
        <SettingsScreen />
      </AppContext.Provider>,
    );

    expect(html).toContain('Đăng nhập');
    expect(html).toContain('Đăng ký');
    expect(html).toContain('Mật khẩu');
    expect(html).toContain('Email + mã OTP');
    expect(html).not.toContain('Tiếp tục với Google');
    expect(html).not.toContain('Tiếp tục với Apple');
  });
});
