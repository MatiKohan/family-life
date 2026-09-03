import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { AuthUser } from '@family-life/types';
import { apiRequest } from '../lib/api-client';
import { useAuthStore } from '../store/auth.store';

function appLocale(lang: string): 'en' | 'he' {
  return lang.toLowerCase().startsWith('he') ? 'he' : 'en';
}

/** Keeps User.locale on the API in sync with the language used in the UI. */
export function useSyncLocale() {
  const { i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setSession = useAuthStore((s) => s.setSession);
  const synced = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !accessToken) return;
    const locale = appLocale(i18n.language);
    const key = `${user.id}:${locale}`;
    if (synced.current === key) return;
    if (user.locale === locale) {
      synced.current = key;
      return;
    }
    synced.current = key;
    void apiRequest<AuthUser>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ locale }),
    })
      .then((updated) => {
        const token = useAuthStore.getState().accessToken;
        if (token) setSession(updated, token);
      })
      .catch(() => {
        synced.current = null;
      });
  }, [user, accessToken, i18n.language, setSession]);
}
