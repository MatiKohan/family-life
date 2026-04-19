export type PageType = 'list' | 'events' | 'tasks' | 'apartments';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export type ApartmentDealType = 'rent' | 'buy';

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

export interface ApartmentSearchParams {
  dealType: ApartmentDealType;
  city?: string;
  neighbourhood?: string;
  minRooms?: number;
  maxRooms?: number;
  minPrice?: number;
  maxPrice?: number;
  minFloor?: number;
  maxFloor?: number;
  requireParking?: boolean;
  requireBalcony?: boolean;
  requireElevator?: boolean;
  requireSecureRoom?: boolean;
}

export interface ApartmentListing {
  id: string;
  title: string;
  price: number | null;
  rooms: number | null;
  floor: number | null;
  area: string | null;
  city: string | null;
  url: string;
  imageUrl: string | null;
  description: string | null;
  provider: string;
  foundAt: string;
  seenBy: string[];
}

export interface Page {
  id: string;
  familyId: string;
  title: string;
  emoji: string;
  type: PageType;
  items: ListItem[];
  taskItems: TaskItem[];
  eventIds: string[];
  apartmentListings: ApartmentListing[];
  metadata: Record<string, unknown>;
  lastSyncedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageSummary {
  id: string;
  title: string;
  emoji: string;
  type: PageType;
  sortOrder?: number;
  folderId?: string | null;
}

export interface FolderSummary {
  id: string;
  name: string;
  emoji: string;
  sortOrder: number;
  pages: PageSummary[];
}
