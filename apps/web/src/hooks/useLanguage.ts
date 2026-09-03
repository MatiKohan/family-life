import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import type { AuthUser } from '@family-life/types';
import { apiRequest } from '../lib/api-client';
import { useAuthStore } from '../store/auth.store';

export function useLanguage() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language.startsWith('he');

  const setLanguage = useCallback((lang: string) => {
    const locale = lang.startsWith('he') ? 'he' : 'en';
    void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'he' ? 'rtl' : 'ltr';
    const { user, accessToken, setSession } = useAuthStore.getState();
    if (user && accessToken) {
      void apiRequest<AuthUser>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ locale }),
      }).then((updated) => {
        const token = useAuthStore.getState().accessToken;
        if (token) setSession(updated, token);
      });
    }
  }, [i18n]);

  return { language: i18n.language, setLanguage, isRTL };
}
