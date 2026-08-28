import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';
import { queryKeys } from '../lib/query-keys';

export function useMarkApartmentSeen(familyId: string, pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) =>
      apiRequest(`/families/${familyId}/pages/${pageId}/apartments/${listingId}/seen`, {
        method: 'PATCH',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(familyId, pageId) }),
  });
}
