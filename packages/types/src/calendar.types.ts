export interface RecurrenceRule {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  until?: string; // ISO date string "YYYY-MM-DD", inclusive last occurrence
  exceptions?: string[]; // "YYYY-MM-DD" dates to skip
}

export type EventRsvpStatus = 'going' | 'maybe' | 'no';

export interface EventAttendee {
  userId: string;
  status: EventRsvpStatus;
  bringing?: string;
}

export interface AssignedListItem {
  text: string;
  pageId: string;
  pageTitle: string;
  pageEmoji: string;
}

export interface AssignedTaskItem {
  text: string;
  status: string;
  pageId: string;
  pageTitle: string;
  pageEmoji: string;
}

export interface DashboardCalendarEvent {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  assigneeId: string | null;
  attendees?: EventAttendee[];
  recurrenceBaseId?: string;
}

export interface FamilyDashboard {
  todayEvents: DashboardCalendarEvent[];
  assigned: {
    listItems: AssignedListItem[];
    tasks: AssignedTaskItem[];
    events: DashboardCalendarEvent[];
  };
  openListItems: number;
  leftoverPageId: string | null;
}
