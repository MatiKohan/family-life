import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';
import { Family, FamilyMember } from '../types/family';

type FamilyWithMembers = Family & { members: FamilyMember[] };

export function useFamily(id: string | undefined) {
  return useQuery<FamilyWithMembers>({
    queryKey: ['families', id],
    queryFn: () => apiRequest<FamilyWithMembers>(`/families/${id}`),
    enabled: !!id,
  });
}
