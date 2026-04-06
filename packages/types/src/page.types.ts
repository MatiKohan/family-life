export type PageType = 'list' | 'tasks' | 'events' | 'apartments';

export interface ListItem {
  id: string;
  text: string;
  checked: boolean;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  deletedAt?: string | null;
}

export interface TaskItem {
  id: string;
  text: string;
  status: 'todo' | 'in-progress' | 'done';
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  deletedAt?: string | null;
}

// ─── Apartments ───────────────────────────────────────────────────────────────

export type ApartmentDealType = 'rent' | 'buy';

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
  id: string;           // external ID from provider (dedup key)
  title: string;
  price: number | null;
  rooms: number | null;
  floor: number | null;
  area: string | null;
  city: string | null;
  url: string;
  imageUrl: string | null;
  description: string | null;
  provider: string;     // e.g. 'yad2-apify'
  foundAt: string;      // ISO date
  seenBy: string[];     // userId[] who dismissed this listing
}

// ─── Page ────────────────────────────────────────────────────────────────────

export interface Page {
  id: string;
  familyId: string;
  title: string;
  emoji: string;
  type: PageType;
  items: ListItem[];                    // for 'list' type
  taskItems: TaskItem[];                // for 'tasks' type
  eventIds: string[];                   // for 'events' type
  apartmentListings: ApartmentListing[]; // for 'apartments' type
  metadata: Record<string, unknown>;    // search params etc.
  lastSyncedAt: string | null;          // for 'apartments' type
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePageRequest {
  title: string;
  emoji?: string;
  type: PageType;
  metadata?: Record<string, unknown>;
}
