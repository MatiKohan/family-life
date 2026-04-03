import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { AuthUser } from '@family-life/types';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

interface RefreshResponse {
  accessToken: string;
  user: AuthUser;
}

class AuthError extends Error {}

async function attemptRefresh(
  setSession: (user: AuthUser, token: string) => void,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (res.status === 401) throw new AuthError('Token expired');
  if (!res.ok) throw new Error('Network error');
  const data = (await res.json()) as RefreshResponse;
  setSession(data.user, data.accessToken);
}

const RETRY_DELAYS = [2000, 4000, 6000]; // 3 retries, increasing backoff

// Module-level singleton: prevents duplicate HTTP calls when React StrictMode
// double-invokes effects (mount → unmount → remount in development).
// Without this, two concurrent refresh calls race: the first rotates the token
// in the DB, making the second one fail with 401 → session cleared → login redirect.
let refreshInFlight: Promise<void> | null = null;

export function useRestoreSession() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [restoring, setRestoring] = useState(!!user && !accessToken);

  useEffect(() => {
    if (!user || accessToken) {
      setRestoring(false);
      return;
    }

    async function restore() {
      if (!refreshInFlight) {
        refreshInFlight = (async () => {
          for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
            try {
              await attemptRefresh(setSession);
              return; // success
            } catch (err) {
              if (err instanceof AuthError) {
                // Token is definitively invalid — log out
                clearSession();
                return;
              }
              // Network/server error — retry after delay
              if (attempt < RETRY_DELAYS.length) {
                await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
              }
            }
          }
          // All retries exhausted due to network errors — keep session intact
        })().finally(() => {
          refreshInFlight = null;
        });
      }

      await refreshInFlight;
    }

    restore().finally(() => setRestoring(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  return { restoring };
}
