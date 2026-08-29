import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../../hooks/useDashboard';
import { localDayRange } from '../../lib/local-day-range';

export function AssignedPage() {
  const { t } = useTranslation();
  const { id: familyId } = useParams<{ id: string }>();
  const { start, end } = localDayRange();
  const { data, isLoading, isError } = useDashboard(familyId, start, end);

  useEffect(() => {
    document.title = `${t('assigned.title')} — Family Life`;
    return () => {
      document.title = 'Family Life';
    };
  }, [t]);

  if (!familyId) return <Navigate to="/" replace />;

  const assigned = data?.assigned;
  const empty =
    !assigned ||
    (assigned.listItems.length === 0 &&
      assigned.tasks.length === 0 &&
      assigned.events.length === 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <h1 className="text-xl font-semibold text-gray-900">{t('assigned.title')}</h1>

      {isLoading && <p className="text-sm text-gray-500">{t('common.loading')}</p>}
      {isError && <p className="text-sm text-red-600">{t('common.error')}</p>}

      {!isLoading && !isError && empty && (
        <p className="text-sm text-gray-500">{t('assigned.empty')}</p>
      )}

      {assigned && assigned.listItems.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            {t('assigned.lists')}
          </h2>
          <ul className="divide-y divide-gray-100">
            {assigned.listItems.map((item) => (
              <li key={`${item.pageId}-${item.text}`}>
                <Link
                  to={`/family/${familyId}/pages/${item.pageId}`}
                  className="flex items-center gap-2 py-3 text-sm text-gray-800 hover:text-brand-700"
                >
                  <span>{item.pageEmoji}</span>
                  <span className="font-medium">{item.text}</span>
                  <span className="text-gray-400 ms-auto">{item.pageTitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {assigned && assigned.tasks.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            {t('assigned.tasks')}
          </h2>
          <ul className="divide-y divide-gray-100">
            {assigned.tasks.map((item) => (
              <li key={`${item.pageId}-${item.text}`}>
                <Link
                  to={`/family/${familyId}/pages/${item.pageId}`}
                  className="flex items-center gap-2 py-3 text-sm text-gray-800 hover:text-brand-700"
                >
                  <span>{item.pageEmoji}</span>
                  <span className="font-medium">{item.text}</span>
                  <span className="text-gray-400 ms-auto">{item.pageTitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {assigned && assigned.events.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            {t('assigned.events')}
          </h2>
          <ul className="divide-y divide-gray-100">
            {assigned.events.map((ev) => (
              <li key={ev.id}>
                <Link
                  to={`/family/${familyId}/calendar?event=${ev.recurrenceBaseId ?? ev.id}`}
                  className="flex items-center gap-2 py-3 text-sm text-gray-800 hover:text-brand-700"
                >
                  <span className="font-medium">{ev.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
