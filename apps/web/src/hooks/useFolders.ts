import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';
import { FolderSummary } from '../types/page';

export function useFolders(familyId: string | undefined) {
  return useQuery<FolderSummary[]>({
    queryKey: ['folders', familyId],
    queryFn: () => apiRequest<FolderSummary[]>(`/families/${familyId}/folders`),
    enabled: !!familyId,
  });
}
