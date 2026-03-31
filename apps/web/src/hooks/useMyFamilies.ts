import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';
import { Family } from '../types/family';

export function useMyFamilies() {
  return useQuery<Family[]>({
    queryKey: ['families'],
    queryFn: () => apiRequest<Family[]>('/families'),
  });
}
