import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';
import { queryKeys } from '../lib/query-keys';

export function useSyncApartments(familyId: string, pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest<{ newCount: number }>(
        `/families/${familyId}/pages/${pageId}/apartments/sync`,
        { method: 'POST' },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(familyId, pageId) }),
  });
}
