import { useEffect } from 'react';

/** Keeps the screen awake while `active` is true (where the Screen Wake Lock API exists). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const l = await navigator.wakeLock.request('screen');
        if (cancelled) void l.release();
        else lock = l;
      } catch {
        /* denied or unsupported: ignore */
      }
    };
    // The lock is released automatically when the tab is hidden; re-acquire on return.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [active]);
}

export function vibrate(ms = 15) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms);
}
