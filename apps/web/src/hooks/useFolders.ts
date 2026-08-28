import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';
import { queryKeys } from '../lib/query-keys';
import { FolderSummary } from '../types/page';

export function useFolders(familyId: string | undefined) {
  return useQuery<FolderSummary[]>({
    queryKey: queryKeys.folders.all(familyId),
    queryFn: () => apiRequest<FolderSummary[]>(`/families/${familyId}/folders`),
    enabled: !!familyId,
  });
}
