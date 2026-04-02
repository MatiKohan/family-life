export interface CalendarEvent {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  isAllDay?: boolean;
}
