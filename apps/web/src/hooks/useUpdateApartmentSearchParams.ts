import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';
import { queryKeys } from '../lib/query-keys';
import type { ApartmentSearchParams } from '../types/page';

export function useUpdateApartmentSearchParams(familyId: string, pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: ApartmentSearchParams) =>
      apiRequest(`/families/${familyId}/pages/${pageId}/apartments/search-params`, {
        method: 'PATCH',
        body: JSON.stringify(params),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(familyId, pageId) }),
  });
}
