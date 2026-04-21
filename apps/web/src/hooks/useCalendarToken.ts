import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';

export function useCalendarToken(familyId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['calendar-token', familyId],
    queryFn: () => apiRequest<{ token: string }>(`/families/${familyId}/calendar-token`),
    staleTime: Infinity,
  });

  const regenerate = useMutation({
    mutationFn: () =>
      apiRequest<{ token: string }>(`/families/${familyId}/calendar-token/regenerate`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['calendar-token', familyId], data);
    },
  });

  return { token: query.data?.token, isLoading: query.isLoading, regenerate };
}
