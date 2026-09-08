export type PageType = 'list' | 'tasks' | 'events' | 'apartments';

export const LIST_MODES = ['plain', 'priced', 'counted', 'ingredients'] as const;
export type ListMode = (typeof LIST_MODES)[number];

export const LIST_CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP'] as const;
export type ListCurrency = (typeof LIST_CURRENCIES)[number];

export const LIST_UNITS = ['g', 'kg', 'l'] as const;
export type ListUnit = (typeof LIST_UNITS)[number];

export function resolveListMode(mode?: string | null): ListMode {
  if (mode === 'priced' || mode === 'counted' || mode === 'ingredients') {
    return mode;
  }
  return 'plain';
}

export function resolveListCurrency(currency?: string | null): ListCurrency {
  if (currency === 'USD' || currency === 'EUR' || currency === 'GBP') {
    return currency;
  }
  return 'ILS';
}

export function resolveListUnit(unit?: string | null): ListUnit {
  if (unit === 'kg' || unit === 'l') return unit;
  return 'g';
}

export interface ListItem {
  id: string;
  text: string;
  checked: boolean;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  deletedAt?: string | null;
  category?: string;
  price?: number | null;
  quantity?: number | null;
  unit?: ListUnit;
}

export interface TaskItem {
  id: string;
  text: string;
  status: 'todo' | 'in-progress' | 'done';
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  deletedAt?: string | null;
  recurrence?: { freq: 'daily' | 'bi-daily' | 'weekly' | 'monthly'; nextDue: string } | null;
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

// ─── Blocks ──────────────────────────────────────────────────────────────────

export interface ListBlock {
  id: string;
  type: 'list';
  title?: string;
  items: ListItem[];
  variant?: 'simple' | 'categorized';
  /** Missing or unknown values behave as `plain`. */
  mode?: ListMode;
  /** Used when `mode` is `priced`. Missing values behave as ILS. */
  currency?: ListCurrency;
}

export interface TextBlock {
  id: string;
  type: 'text';
  title?: string;
  content: string;
}

export type Block = ListBlock | TextBlock;

// ─── Page ────────────────────────────────────────────────────────────────────

export interface Page {
  id: string;
  familyId: string;
  title: string;
  emoji: string;
  type: PageType;
  items: ListItem[];                    // for 'list' type
  blocks?: Block[];                     // for 'list' type (canvas format)
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
