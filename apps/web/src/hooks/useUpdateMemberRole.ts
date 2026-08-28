import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';
import { queryKeys } from '../lib/query-keys';
import type { FamilyMember, FamilyRole } from '../types/family';

export function useUpdateMemberRole(familyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: FamilyRole }) =>
      apiRequest<FamilyMember>(`/families/${familyId}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.families.detail(familyId) });
    },
  });
}
