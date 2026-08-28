import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';
import { queryKeys } from '../lib/query-keys';
import type { FamilyMember } from '../types/family';

interface UpdateMyMemberPayload {
  whatsappPhone?: string | null;
    notificationSettings?: {
    invite?: boolean;
    itemAssigned?: boolean;
    eventReminder?: boolean;
    itemAdded?: boolean;
  };
}

export function useUpdateMyMember(familyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateMyMemberPayload) =>
      apiRequest<FamilyMember>(`/families/${familyId}/members/me`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.families.detail(familyId) });
    },
  });
}
