import { useInfiniteQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';
import { ActivityFeedResponse } from '@family-life/types';

export function useActivityFeed(familyId: string) {
  return useInfiniteQuery<ActivityFeedResponse>({
    queryKey: ['activity', familyId],
    queryFn: ({ pageParam }) =>
      apiRequest<ActivityFeedResponse>(
        `/families/${familyId}/activity?limit=20${pageParam ? `&cursor=${pageParam}` : ''}`,
      ),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!familyId,
    refetchInterval: 60_000,
  });
}
