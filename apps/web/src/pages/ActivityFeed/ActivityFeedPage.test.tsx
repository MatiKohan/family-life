import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { ActivityFeedPage, formatActivity, timeAgo } from './ActivityFeedPage';
import { useAuthStore } from '../../store/auth.store';
import type { ActivityLog, ActivityFeedResponse } from '@family-life/types';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

const mockLog: ActivityLog = {
  id: 'log-1',
  familyId: 'family-1',
  userId: 'user-1',
  type: 'item_added',
  payload: { itemText: 'Milk', pageTitle: 'Groceries' },
  createdAt: new Date().toISOString(),
  user: { id: 'user-1', name: 'Test User', avatarUrl: null },
};

function renderPage() {
  useAuthStore.getState().setSession({ id: 'u1', email: 'a@b.com', name: 'A', avatarUrl: null }, 'tok');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/family/family-1/activity']}>
        <Routes>
          <Route path="/family/:id/activity" element={<ActivityFeedPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ActivityFeedPage', () => {
  it('renders page title', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Activity')).toBeInTheDocument());
  });

  it('shows empty state when no activity', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('No activity yet')).toBeInTheDocument());
  });

  it('renders activity entries when data is returned', async () => {
    const response: ActivityFeedResponse = { items: [mockLog], nextCursor: null };
    server.use(
      http.get('/api/families/:familyId/activity', () => HttpResponse.json(response)),
    );
    renderPage();
    await waitFor(() => expect(screen.getByText('Test User')).toBeInTheDocument());
    expect(screen.getByText('Added "Milk" to Groceries')).toBeInTheDocument();
  });

  it('shows Load more button when nextCursor is set', async () => {
    const response: ActivityFeedResponse = { items: [mockLog], nextCursor: 'cursor-123' };
    server.use(
      http.get('/api/families/:familyId/activity', () => HttpResponse.json(response)),
    );
    renderPage();
    await waitFor(() => expect(screen.getByText('Load more')).toBeInTheDocument());
  });

  it('does not show Load more button when nextCursor is null', async () => {
    const response: ActivityFeedResponse = { items: [mockLog], nextCursor: null };
    server.use(
      http.get('/api/families/:familyId/activity', () => HttpResponse.json(response)),
    );
    renderPage();
    await waitFor(() => expect(screen.getByText('Test User')).toBeInTheDocument());
    expect(screen.queryByText('Load more')).not.toBeInTheDocument();
  });
});

// Simple passthrough t function for unit tests (mirrors en.json interpolation)
function t(key: string, opts?: Record<string, unknown>): string {
  const templates: Record<string, string> = {
    'activity.item_added': 'Added "{{itemText}}" to {{pageTitle}}',
    'activity.item_checked': 'Checked off "{{itemText}}" in {{pageTitle}}',
    'activity.task_created': 'Created task "{{taskTitle}}" in {{pageTitle}}',
    'activity.task_status_changed': 'Moved "{{taskTitle}}" to {{status}} in {{pageTitle}}',
    'activity.event_created': 'Created event "{{title}}"',
    'activity.member_invited': 'Joined the family',
    'activity.unknown': 'Unknown activity',
    'activity.justNow': 'just now',
    'activity.minAgo': '{{count}} min ago',
    'activity.hoursAgo': '{{count}} hours ago',
  };
  let str = templates[key] ?? key;
  if (opts) {
    for (const [k, v] of Object.entries(opts)) {
      str = str.replace(`{{${k}}}`, String(v));
    }
  }
  return str;
}

describe('formatActivity', () => {
  const base: ActivityLog = {
    id: 'x',
    familyId: 'f1',
    userId: 'u1',
    type: 'item_added',
    payload: {},
    createdAt: new Date().toISOString(),
    user: { id: 'u1', name: 'User' },
  };

  it('formats item_added', () => {
    expect(formatActivity({ ...base, type: 'item_added', payload: { itemText: 'Eggs', pageTitle: 'Shopping' } }, t))
      .toBe('Added "Eggs" to Shopping');
  });

  it('formats item_checked', () => {
    expect(formatActivity({ ...base, type: 'item_checked', payload: { itemText: 'Eggs', pageTitle: 'Shopping' } }, t))
      .toBe('Checked off "Eggs" in Shopping');
  });

  it('formats task_created', () => {
    expect(formatActivity({ ...base, type: 'task_created', payload: { taskTitle: 'Buy tickets', pageTitle: 'Tasks' } }, t))
      .toBe('Created task "Buy tickets" in Tasks');
  });

  it('formats task_status_changed', () => {
    expect(formatActivity({ ...base, type: 'task_status_changed', payload: { taskTitle: 'Buy tickets', status: 'done', pageTitle: 'Tasks' } }, t))
      .toBe('Moved "Buy tickets" to done in Tasks');
  });

  it('formats event_created', () => {
    expect(formatActivity({ ...base, type: 'event_created', payload: { title: 'Birthday' } }, t))
      .toBe('Created event "Birthday"');
  });

  it('formats member_invited', () => {
    expect(formatActivity({ ...base, type: 'member_invited', payload: {} }, t))
      .toBe('Joined the family');
  });
});

describe('timeAgo', () => {
  it('returns "just now" for very recent timestamps', () => {
    const now = new Date().toISOString();
    expect(timeAgo(now, t)).toBe('just now');
  });

  it('returns minutes ago for recent timestamps', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(timeAgo(fiveMinAgo, t)).toBe('5 min ago');
  });

  it('returns hours ago for timestamps within 24h', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000).toISOString();
    expect(timeAgo(twoHoursAgo, t)).toBe('2 hours ago');
  });

  it('returns formatted date for older timestamps', () => {
    const old = new Date('2026-04-01T12:00:00.000Z').toISOString();
    const result = timeAgo(old, t);
    expect(result).toMatch(/Apr 1/);
  });
});
