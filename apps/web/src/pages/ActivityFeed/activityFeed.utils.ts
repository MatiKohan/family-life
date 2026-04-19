import { ActivityLog } from '@family-life/types';

type TFunction = (key: string, opts?: Record<string, unknown>) => string;

export function formatActivity(log: ActivityLog, t: TFunction): string {
  const p = log.payload;
  switch (log.type) {
    case 'item_added':
      return t('activity.item_added', { itemText: p.itemText, pageTitle: p.pageTitle });
    case 'item_checked':
      return t('activity.item_checked', { itemText: p.itemText, pageTitle: p.pageTitle });
    case 'task_created':
      return t('activity.task_created', { taskTitle: p.taskTitle, pageTitle: p.pageTitle });
    case 'task_status_changed':
      return t('activity.task_status_changed', { taskTitle: p.taskTitle, status: p.status, pageTitle: p.pageTitle });
    case 'event_created':
      return t('activity.event_created', { title: p.title });
    case 'member_invited':
      return t('activity.member_invited');
    default:
      return t('activity.unknown');
  }
}

export function timeAgo(dateStr: string, t: TFunction): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);

  if (diffMin < 1) return t('activity.justNow');
  if (diffMin < 60) return t('activity.minAgo', { count: diffMin });
  if (diffHours < 24) return t('activity.hoursAgo', { count: diffHours });

  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
