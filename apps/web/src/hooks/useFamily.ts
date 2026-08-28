import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';
import { queryKeys } from '../lib/query-keys';
import { Family, FamilyMember } from '../types/family';

type FamilyWithMembers = Family & { members: FamilyMember[] };

export function useFamily(id: string | undefined) {
  return useQuery<FamilyWithMembers>({
    queryKey: queryKeys.families.detail(id),
    queryFn: () => apiRequest<FamilyWithMembers>(`/families/${id}`),
    enabled: !!id,
  });
}
