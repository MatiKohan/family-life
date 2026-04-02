export type PageType = 'list' | 'events' | 'tasks';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface TaskItem {
  id: string;
  text: string;
  assigneeId: string | null;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
}

export interface ListItem {
  id: string;
  text: string;
  checked: boolean;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
}

export interface Page {
  _id: string;
  familyId: string;
  title: string;
  emoji: string;
  type: PageType;
  items: ListItem[];
  taskItems: TaskItem[];
  eventIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageSummary {
  _id: string;
  title: string;
  emoji: string;
  type: PageType;
}
