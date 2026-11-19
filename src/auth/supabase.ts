import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const secureSessionStorage = {
  getItem: (key: string) => SecureStorage.getItem(key),
  setItem: (key: string, value: string) => SecureStorage.setItem(key, value),
  removeItem: async (key: string) => {
    await SecureStorage.remove(key);
  },
};

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          flowType: 'pkce',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: !Capacitor.isNativePlatform(),
          ...(Capacitor.isNativePlatform() ? { storage: secureSessionStorage } : {}),
        },
      })
    : null;

export function authRedirectUrl(): string {
  if (Capacitor.isNativePlatform()) return 'pickleballscorekeeper://auth/callback';
  return new URL('/auth/callback', window.location.origin).toString();
}
