import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';
import { Page } from '../types/page';

export function usePage(familyId: string | undefined, pageId: string | undefined) {
  return useQuery<Page>({
    queryKey: ['pages', familyId, pageId],
    queryFn: () => apiRequest<Page>(`/families/${familyId}/pages/${pageId}`),
    enabled: !!familyId && !!pageId,
  });
}
