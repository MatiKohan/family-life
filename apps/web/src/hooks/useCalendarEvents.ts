import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';
import { CalendarEvent } from '../types/calendar';

export function useCalendarEvents(
  familyId: string | undefined,
  start: string,
  end: string,
) {
  return useQuery<CalendarEvent[]>({
    queryKey: ['calendar', familyId, start, end],
    queryFn: () =>
      apiRequest<CalendarEvent[]>(
        `/families/${familyId}/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      ),
    enabled: !!familyId && !!start && !!end,
  });
}
