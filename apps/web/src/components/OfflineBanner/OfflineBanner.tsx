import { useTranslation } from 'react-i18next';
import { useIsOnline } from '../../hooks/useIsOnline';

export function OfflineBanner() {
  const { t } = useTranslation();
  const isOnline = useIsOnline();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-amber-400 text-amber-900 text-sm font-medium text-center py-2 px-4"
    >
      {t('offline.banner')}
    </div>
  );
}
