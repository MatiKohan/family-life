import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';

export interface CreateInviteResult {
  token: string;
  inviteUrl: string;
  expiresAt: string;
}

export function useCreateInvite(familyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiRequest<CreateInviteResult>(`/families/${familyId}/invites/link`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invites', familyId] });
    },
  });
}
