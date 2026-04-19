import { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ActivityLog } from '@family-life/types';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import { formatActivity, timeAgo } from './activityFeed.utils';

// ---- helpers ---------------------------------------------------------------

const AVATAR_COLORS = [
  'bg-rose-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-green-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-pink-500',
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function avatarColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ---- sub-components --------------------------------------------------------

function ActivitySkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading activity">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-3 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 bg-gray-200 rounded w-1/4" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
          </div>
          <div className="h-3 bg-gray-200 rounded w-12 shrink-0 mt-1" />
        </div>
      ))}
    </div>
  );
}

function ActivityRow({ log }: { log: ActivityLog }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3 py-3">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 ${avatarColor(log.userId)}`}
        aria-hidden="true"
      >
        {getInitials(log.user.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{log.user.name}</p>
        <p className="text-sm text-gray-600">{formatActivity(log, t)}</p>
      </div>
      <time
        dateTime={log.createdAt}
        className="text-xs text-gray-400 shrink-0 mt-0.5 whitespace-nowrap"
      >
        {timeAgo(log.createdAt, t)}
      </time>
    </div>
  );
}

// ---- page ------------------------------------------------------------------

export function ActivityFeedPage() {
  const { t } = useTranslation();
  const { id: familyId } = useParams<{ id: string }>();

  useEffect(() => {
    document.title = `${t('activity.title')} — Family Life`;
    return () => {
      document.title = 'Family Life';
    };
  }, [t]);

  if (!familyId) return <Navigate to="/" replace />;

  return <ActivityFeedContent familyId={familyId} />;
}

function ActivityFeedContent({ familyId }: { familyId: string }) {
  const { t } = useTranslation();
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useActivityFeed(familyId);

  const allItems = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">{t('activity.title')}</h1>

      {isLoading && <ActivitySkeleton />}

      {isError && (
        <p className="text-sm text-red-600">{t('common.error')}</p>
      )}

      {!isLoading && !isError && allItems.length === 0 && (
        <p className="text-sm text-gray-500">{t('activity.empty')}</p>
      )}

      {allItems.length > 0 && (
        <div className="divide-y divide-gray-100">
          {allItems.map((log) => (
            <ActivityRow key={log.id} log={log} />
          ))}
        </div>
      )}

      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-4 py-2 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {isFetchingNextPage ? t('common.loading') : t('activity.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}
