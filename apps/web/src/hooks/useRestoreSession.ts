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

    let cancelled = false;

    async function restore() {
      for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
        try {
          await attemptRefresh(setSession);
          return; // success
        } catch (err) {
          if (err instanceof AuthError) {
            // Token is definitively invalid — log out
            if (!cancelled) clearSession();
            return;
          }
          // Network/server error — retry after delay
          if (attempt < RETRY_DELAYS.length) {
            await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
          }
        }
      }
      // All retries exhausted due to network errors — keep user session intact,
      // apiRequest will retry refresh on the first API call
    }

    restore().finally(() => {
      if (!cancelled) setRestoring(false);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  return { restoring };
}
