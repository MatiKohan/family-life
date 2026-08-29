import { useQuery } from '@tanstack/react-query';
import type { FamilyDashboard } from '@family-life/types';
import { apiRequest } from '../lib/api-client';
import { queryKeys } from '../lib/query-keys';

export function useDashboard(
  familyId: string | undefined,
  start: string,
  end: string,
) {
  return useQuery<FamilyDashboard>({
    queryKey: queryKeys.dashboard.range(familyId, start, end),
    queryFn: () =>
      apiRequest<FamilyDashboard>(
        `/families/${familyId}/dashboard?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      ),
    enabled: !!familyId && !!start && !!end,
  });
}
