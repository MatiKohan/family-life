import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';
import { PageSummary } from '../types/page';

export function usePages(familyId: string | undefined) {
  return useQuery<PageSummary[]>({
    queryKey: ['pages', familyId],
    queryFn: () => apiRequest<PageSummary[]>(`/families/${familyId}/pages`),
    enabled: !!familyId,
  });
}
