import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';
import { queryKeys } from '../lib/query-keys';
import { Family } from '../types/family';

export function useMyFamilies() {
  return useQuery<Family[]>({
    queryKey: queryKeys.families.all(),
    queryFn: () => apiRequest<Family[]>('/families'),
  });
}
