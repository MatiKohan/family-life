import { http, HttpResponse } from 'msw';
import type { AuthUser } from '@family-life/types';
import { PageSummary, Page, FolderSummary } from '../types/page';
import { CalendarEvent } from '../types/calendar';

export const mockUser: AuthUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: null,
};

export const mockPageSummaries: PageSummary[] = [
  { id: 'page-1', title: 'Groceries', emoji: '🛒', type: 'list', folderId: null },
  { id: 'page-2', title: 'Tasks', emoji: '✅', type: 'list', folderId: null },
];

export const mockFolders: FolderSummary[] = [];

export const mockPage: Page = {
  id: 'page-1',
  familyId: 'family-1',
  title: 'Groceries',
  emoji: '🛒',
  type: 'list',
  items: [
    {
      id: 'item-1',
      text: 'Milk',
      checked: false,
      assigneeId: null,
      dueDate: null,
      createdAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'item-2',
      text: 'Eggs',
      checked: true,
      assigneeId: null,
      dueDate: null,
      createdAt: '2026-03-01T00:00:00.000Z',
    },
  ],
  taskItems: [],
  eventIds: [],
  apartmentListings: [],
  metadata: {},
  lastSyncedAt: null,
  createdBy: 'user-1',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
};

export const mockTaskPage: Page = {
  id: 'page-tasks',
  familyId: 'family-1',
  title: 'Sprint Tasks',
  emoji: '✅',
  type: 'tasks',
  items: [],
  taskItems: [
    {
      id: 'task-1',
      text: 'Design mockups',
      assigneeId: null,
      status: 'todo',
      dueDate: null,
      createdAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'task-2',
      text: 'Write tests',
      assigneeId: null,
      status: 'in-progress',
      dueDate: null,
      createdAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'task-3',
      text: 'Deploy',
      assigneeId: null,
      status: 'done',
      dueDate: null,
      createdAt: '2026-03-01T00:00:00.000Z',
    },
  ],
  eventIds: [],
  apartmentListings: [],
  metadata: {},
  lastSyncedAt: null,
  createdBy: 'user-1',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
};

export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: 'event-1',
    familyId: 'family-1',
    title: 'Birthday Party',
    description: null,
    startAt: '2026-04-05T18:00:00.000Z',
    endAt: '2026-04-05T21:00:00.000Z',
    isAllDay: false,
    reminderMinutesBefore: null,
    createdBy: 'user-1',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'event-2',
    familyId: 'family-1',
    title: 'School Meeting',
    description: 'Parent-teacher conference',
    startAt: '2026-04-12T00:00:00.000Z',
    endAt: '2026-04-12T23:59:59.000Z',
    isAllDay: true,
    reminderMinutesBefore: null,
    createdBy: 'user-1',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
];

export const handlers = [
  http.get('/api/health', () => HttpResponse.json({ status: 'ok' })),
  http.get('/api/auth/me', () => HttpResponse.json(mockUser)),
  http.post('/api/auth/refresh', () =>
    HttpResponse.json({ accessToken: 'new-mock-token', user: mockUser }),
  ),
  http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })),

  // Folders
  http.get('/api/families/:familyId/folders', () =>
    HttpResponse.json(mockFolders),
  ),
  http.post('/api/families/:familyId/folders', async ({ request }) => {
    const body = (await request.json()) as { name: string; emoji?: string };
    const newFolder: FolderSummary = {
      id: 'folder-new',
      name: body.name,
      emoji: body.emoji ?? '📁',
      sortOrder: 0,
      pages: [],
    };
    return HttpResponse.json(newFolder, { status: 201 });
  }),
  http.patch('/api/families/:familyId/folders/reorder', () =>
    new HttpResponse(null, { status: 204 }),
  ),
  http.patch('/api/families/:familyId/folders/:folderId', async ({ request, params }) => {
    const body = (await request.json()) as { name?: string; emoji?: string };
    const updated: FolderSummary = {
      id: params.folderId as string,
      name: body.name ?? 'Folder',
      emoji: body.emoji ?? '📁',
      sortOrder: 0,
      pages: [],
    };
    return HttpResponse.json(updated);
  }),
  http.delete('/api/families/:familyId/folders/:folderId', () =>
    new HttpResponse(null, { status: 204 }),
  ),

  // Pages
  http.get('/api/families/:familyId/pages', () =>
    HttpResponse.json(mockPageSummaries),
  ),
  http.post('/api/families/:familyId/pages', async ({ request }) => {
    const body = (await request.json()) as { title: string; emoji: string; type: string };
    const newPage: PageSummary = {
      id: 'page-new',
      title: body.title,
      emoji: body.emoji,
      type: body.type as PageSummary['type'],
    };
    return HttpResponse.json(newPage, { status: 201 });
  }),
  http.get('/api/families/:familyId/pages/:pageId', () =>
    HttpResponse.json(mockPage),
  ),

  // Page items
  http.post('/api/families/:familyId/pages/:pageId/items', async ({ request }) => {
    const body = (await request.json()) as { text: string };
    return HttpResponse.json(
      {
        id: 'item-new',
        text: body.text,
        checked: false,
        assigneeId: null,
        dueDate: null,
        createdAt: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),
  http.patch('/api/families/:familyId/pages/:pageId/items/:itemId', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(body);
  }),
  http.delete('/api/families/:familyId/pages/:pageId/items/:itemId', () =>
    new HttpResponse(null, { status: 204 }),
  ),

  // Calendar events
  http.get('/api/families/:familyId/calendar', () =>
    HttpResponse.json(mockCalendarEvents),
  ),
  http.post('/api/families/:familyId/calendar', async ({ request }) => {
    const body = (await request.json()) as {
      title: string;
      description?: string;
      startAt: string;
      endAt: string;
      isAllDay?: boolean;
    };
    const newEvent: CalendarEvent = {
      id: 'event-new',
      familyId: 'family-1',
      title: body.title,
      description: body.description ?? null,
      startAt: body.startAt,
      endAt: body.endAt,
      isAllDay: body.isAllDay ?? false,
      reminderMinutesBefore: null,
      createdBy: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(newEvent, { status: 201 });
  }),
  http.patch('/api/families/:familyId/calendar/:eventId', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(body);
  }),
  http.delete('/api/families/:familyId/calendar/:eventId', () =>
    new HttpResponse(null, { status: 204 }),
  ),

  // Page event-refs
  http.post('/api/families/:familyId/pages/:pageId/event-refs', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(body, { status: 201 });
  }),

  // Apartment search params, sync, seen
  http.patch('/api/families/:familyId/pages/:pageId/apartments/search-params', () =>
    new HttpResponse(null, { status: 204 }),
  ),
  http.post('/api/families/:familyId/pages/:pageId/apartments/sync', () =>
    new HttpResponse(null, { status: 204 }),
  ),
  http.patch('/api/families/:familyId/pages/:pageId/apartments/:listingId/seen', () =>
    new HttpResponse(null, { status: 204 }),
  ),

  // Activity feed
  http.get('/api/families/:familyId/activity', () =>
    HttpResponse.json({ items: [], nextCursor: null }),
  ),

  // Task items
  http.post('/api/families/:familyId/pages/:pageId/task-items', async ({ request }) => {
    const body = (await request.json()) as { text: string; status: string };
    return HttpResponse.json(
      {
        id: 'task-new',
        text: body.text,
        assigneeId: null,
        status: body.status ?? 'todo',
        dueDate: null,
        createdAt: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),
  http.patch('/api/families/:familyId/pages/:pageId/task-items/:taskId', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(body);
  }),
  http.delete('/api/families/:familyId/pages/:pageId/task-items/:taskId', () =>
    new HttpResponse(null, { status: 204 }),
  ),
];
