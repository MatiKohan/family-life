import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';
import { queryKeys } from '../lib/query-keys';
import { Page } from '../types/page';

export function usePage(familyId: string | undefined, pageId: string | undefined) {
  return useQuery<Page>({
    queryKey: queryKeys.pages.detail(familyId, pageId),
    queryFn: () => apiRequest<Page>(`/families/${familyId}/pages/${pageId}`),
    enabled: !!familyId && !!pageId && pageId !== 'undefined',
  });
}
