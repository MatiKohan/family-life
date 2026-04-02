import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

export function useLanguage() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  const setLanguage = useCallback((lang: string) => {
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [i18n]);

  return { language: i18n.language, setLanguage, isRTL };
}
