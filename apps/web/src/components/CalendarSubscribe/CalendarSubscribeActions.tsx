import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calendarSubscribeLinks } from '../../lib/calendar-subscribe';
import { useCalendarToken } from '../../hooks/useCalendarToken';

interface CalendarSubscribeActionsProps {
  familyId: string;
  showRegenerate?: boolean;
}

export function CalendarSubscribeActions({
  familyId,
  showRegenerate = false,
}: CalendarSubscribeActionsProps) {
  const { t } = useTranslation();
  const { token, isLoading, regenerate } = useCalendarToken(familyId);
  const [linkCopied, setLinkCopied] = useState(false);

  if (isLoading) {
    return <div className="h-8 bg-gray-100 rounded animate-pulse w-48" />;
  }
  if (!token) return null;

  const links = calendarSubscribeLinks(familyId, token);

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{t('calendar.subscribeHint')}</p>
      <div className="flex flex-wrap gap-2">
        <a
          href={links.googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
        >
          {t('calendar.addToGoogle')}
        </a>
        <a
          href={links.webcalUrl}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {t('calendar.addToApple')}
        </a>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(links.webcalUrl).then(() => {
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 2000);
            });
          }}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {linkCopied ? t('calendar.linkCopied') : t('calendar.copyLink')}
        </button>
        {showRegenerate && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t('calendar.regenerateConfirm'))) {
                regenerate.mutate();
              }
            }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {t('calendar.regenerateToken')}
          </button>
        )}
      </div>
    </div>
  );
}
