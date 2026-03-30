import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { AuthUser } from '@my-app/types';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

interface RefreshResponse {
  accessToken: string;
  user: AuthUser;
}

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

    fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('refresh failed');
        const data = (await res.json()) as RefreshResponse;
        setSession(data.user, data.accessToken);
      })
      .catch(() => clearSession())
      .finally(() => setRestoring(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount — intentional: we want snapshot of initial store state

  return { restoring };
}
