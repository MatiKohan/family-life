export type PageType = 'list' | 'tasks' | 'events';

export interface ListItem {
  id: string;
  text: string;
  checked: boolean;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  text: string;
  status: 'todo' | 'in-progress' | 'done';
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
}

export interface Page {
  id: string;
  familyId: string;
  title: string;
  emoji: string;
  type: PageType;
  items: ListItem[];       // for 'list' type
  taskItems: TaskItem[];   // for 'tasks' type
  eventIds: string[];      // for 'events' type
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePageRequest {
  title: string;
  emoji?: string;
  type: PageType;
}
