import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePage } from '../../hooks/usePage';
import { ListPageView } from '../../components/ListPageView/ListPageView';
import { TasksPageView } from '../../components/TasksPageView/TasksPageView';
import { EventsPageView } from '../../components/EventsPageView/EventsPageView';

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
      <div className="flex-1 flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"
          role="status"
          aria-label="Loading"
        />
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
    return <ListPageView page={page} familyId={familyId!} />;
  }

  if (page.type === 'tasks') {
    return <TasksPageView page={page} familyId={familyId!} />;
  }

  if (page.type === 'events') {
    return <EventsPageView page={page} familyId={familyId!} />;
  }

  return null;
}
