import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';
import { queryKeys } from '../lib/query-keys';
import { SearchResults } from '../types/search';

export function useSearch(familyId: string, q: string) {
  return useQuery({
    queryKey: queryKeys.search.query(familyId, q),
    queryFn: () =>
      apiRequest<SearchResults>(
        `/families/${familyId}/search?q=${encodeURIComponent(q)}`,
      ),
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
  });
}
