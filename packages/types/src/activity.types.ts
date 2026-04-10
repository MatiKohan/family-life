export type ActivityType =
  | 'item_checked'
  | 'item_added'
  | 'task_created'
  | 'task_status_changed'
  | 'event_created'
  | 'member_invited';

export interface ActivityLog {
  id: string;
  familyId: string;
  userId: string;
  type: ActivityType;
  payload: Record<string, unknown>;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export interface ActivityFeedResponse {
  items: ActivityLog[];
  nextCursor: string | null;
}
