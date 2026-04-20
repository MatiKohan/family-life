export interface CalendarEvent {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  reminderMinutesBefore: number | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  recurrence?: {
    freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
    until?: string;
  } | null;
  recurrenceBaseId?: string;
  instanceDate?: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  isAllDay?: boolean;
  reminderMinutesBefore?: number | null;
  recurrence?: {
    freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
    until?: string;
  } | null;
}
