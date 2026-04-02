import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';
import { FamilyInvite } from '../types/family';

export function useInvites(familyId: string | undefined) {
  return useQuery<FamilyInvite[]>({
    queryKey: ['invites', familyId],
    queryFn: () => apiRequest<FamilyInvite[]>(`/families/${familyId}/invites`),
    enabled: !!familyId,
  });
}
