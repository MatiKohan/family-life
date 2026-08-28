import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';
import { invalidateForRealtimeEvent } from '../lib/query-keys';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export function useRealtimeEvents(familyId: string) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!familyId || !accessToken) return;

    const url = `${API_BASE}/families/${familyId}/stream?token=${encodeURIComponent(accessToken)}`;
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { type: string };
        void invalidateForRealtimeEvent(queryClient, familyId, data.type);
      } catch {
        // ignore malformed events
      }
    };

    return () => es.close();
  }, [familyId, accessToken, queryClient]);
}
