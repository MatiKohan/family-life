import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePage } from '../../hooks/usePage';
import { CanvasPageView } from '../../components/CanvasPageView/CanvasPageView';
import { TasksPageView } from '../../components/TasksPageView/TasksPageView';
import { EventsPageView } from '../../components/EventsPageView/EventsPageView';
import { ApartmentsPageView } from '../../components/ApartmentsPageView/ApartmentsPageView';

export function PageViewPage() {
  const { t } = useTranslation();
  const { id: familyId, pageId } = useParams<{ id: string; pageId: string }>();
  const { data: page, isLoading, isError } = usePage(familyId, pageId);

  // Update browser tab title
  useEffect(() => {
    if (page) {
      document.title = `${page.emoji} ${page.title} — Family Life`;
    }
    return () => {
      document.title = 'Family Life';
    };
  }, [page]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col p-4 gap-4 animate-pulse" role="status" aria-label="Loading">
        {/* Page title */}
        <div className="flex items-center gap-3 px-1 pt-2">
          <div className="w-8 h-8 rounded-lg bg-gray-200" />
          <div className="h-6 w-40 rounded-lg bg-gray-200" />
        </div>

        {/* Add-item input bar */}
        <div className="h-11 w-full rounded-xl bg-gray-100" />

        {/* Item rows */}
        <ul className="space-y-2">
          {[72, 56, 88, 64, 48].map((w, i) => (
            <li key={i} className="flex items-center gap-3 px-1 py-2">
              <div className="w-5 h-5 rounded-md bg-gray-200 shrink-0" />
              <div className={`h-4 rounded-md bg-gray-200`} style={{ width: `${w}%` }} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (isError || !page) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{t('pages.notFound')}</h2>
          <p className="text-gray-500 text-sm mb-4">
            {t('pages.loadError')}
          </p>
          <Link
            to={`/family/${familyId}`}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            {t('pages.notFoundBack')}
          </Link>
        </div>
      </div>
    );
  }

  if (page.type === 'list') {
    return <CanvasPageView page={page} familyId={familyId!} />;
  }

  if (page.type === 'tasks') {
    return <TasksPageView page={page} familyId={familyId!} />;
  }

  if (page.type === 'events') {
    return <EventsPageView page={page} familyId={familyId!} />;
  }

  if (page.type === 'apartments') {
    return <ApartmentsPageView familyId={familyId!} pageId={pageId!} />;
  }

  return null;
}
