import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';
import type { Family } from '../types/family';

interface UpdateFamilyPayload {
  name?: string;
  emoji?: string;
}

export function useUpdateFamily(familyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateFamilyPayload) =>
      apiRequest<Family>(`/families/${familyId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });
}
