import { http, HttpResponse } from 'msw';
import type { AuthUser } from '@family-life/types';
import { PageSummary, Page } from '../types/page';

export const mockUser: AuthUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: null,
};

export const mockPageSummaries: PageSummary[] = [
  { _id: 'page-1', title: 'Groceries', emoji: '🛒', type: 'list' },
  { _id: 'page-2', title: 'Tasks', emoji: '✅', type: 'list' },
];

export const mockPage: Page = {
  _id: 'page-1',
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
  createdBy: 'user-1',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
};

export const mockTaskPage: Page = {
  _id: 'page-tasks',
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
  createdBy: 'user-1',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
};

export const handlers = [
  http.get('/api/health', () => HttpResponse.json({ status: 'ok' })),
  http.get('/api/auth/me', () => HttpResponse.json(mockUser)),
  http.post('/api/auth/refresh', () =>
    HttpResponse.json({ accessToken: 'new-mock-token', user: mockUser }),
  ),
  http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })),

  // Pages
  http.get('/api/families/:familyId/pages', () =>
    HttpResponse.json(mockPageSummaries),
  ),
  http.post('/api/families/:familyId/pages', async ({ request }) => {
    const body = (await request.json()) as { title: string; emoji: string; type: string };
    const newPage: PageSummary = {
      _id: 'page-new',
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
