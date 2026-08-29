import type { QueryClient } from '@tanstack/react-query';

/** Canonical TanStack Query keys. Use these instead of string-literal arrays. */
export const queryKeys = {
  families: {
    all: () => ['families'] as const,
    detail: (id: string | undefined) => ['families', id] as const,
  },
  pages: {
    all: (familyId: string | undefined) => ['pages', familyId] as const,
    detail: (familyId: string | undefined, pageId: string | undefined) =>
      ['pages', familyId, pageId] as const,
  },
  folders: {
    all: (familyId: string | undefined) => ['folders', familyId] as const,
  },
  calendar: {
    all: (familyId: string | undefined) => ['calendar', familyId] as const,
    range: (familyId: string | undefined, start: string, end: string) =>
      ['calendar', familyId, start, end] as const,
    token: (familyId: string | undefined) => ['calendar-token', familyId] as const,
  },
  activity: {
    all: (familyId: string | undefined) => ['activity', familyId] as const,
  },
  dashboard: {
    all: (familyId: string | undefined) => ['dashboard', familyId] as const,
    range: (familyId: string | undefined, start: string, end: string) =>
      ['dashboard', familyId, start, end] as const,
  },
  search: {
    query: (familyId: string | undefined, q: string) => ['search', familyId, q] as const,
  },
  invites: {
    all: (familyId: string | undefined) => ['invites', familyId] as const,
  },
};

/** Map SSE event types to the same keys the fetch hooks use. */
export function invalidateForRealtimeEvent(
  queryClient: QueryClient,
  familyId: string,
  type: string,
): Promise<void> {
  if (type === 'pages') {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.all(familyId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.activity.all(familyId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(familyId) }),
    ]).then(() => undefined);
  }
  if (type === 'calendar') {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all(familyId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(familyId) }),
    ]).then(() => undefined);
  }
  if (type === 'activity') {
    return queryClient.invalidateQueries({ queryKey: queryKeys.activity.all(familyId) });
  }
  return Promise.resolve();
}
