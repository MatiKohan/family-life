import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useActivityFeed } from './useActivityFeed';
import { useAuthStore } from '../store/auth.store';
import type { ActivityLog, ActivityFeedResponse } from '@family-life/types';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

const mockActivityLog: ActivityLog = {
  id: 'log-1',
  familyId: 'family-1',
  userId: 'user-1',
  type: 'item_added',
  payload: { itemText: 'Milk', pageTitle: 'Groceries' },
  createdAt: new Date().toISOString(),
  user: { id: 'user-1', name: 'Test User', avatarUrl: null },
};

function TestComponent({ familyId }: { familyId: string }) {
  const { data, isLoading, isError } = useActivityFeed(familyId);
  if (isLoading) return <div>loading</div>;
  if (isError) return <div>error</div>;
  const items = data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <ul>
      {items.map((log) => (
        <li key={log.id}>{log.id}</li>
      ))}
      {items.length === 0 && <li>empty</li>}
    </ul>
  );
}

function render$(familyId: string) {
  useAuthStore.getState().setSession({ id: 'u1', email: 'a@b.com', name: 'A', avatarUrl: null }, 'tok');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TestComponent familyId={familyId} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('useActivityFeed', () => {
  it('returns empty items from default handler', async () => {
    render$('family-1');
    await waitFor(() => expect(screen.getByText('empty')).toBeInTheDocument());
  });

  it('returns items when the server returns them', async () => {
    const response: ActivityFeedResponse = { items: [mockActivityLog], nextCursor: null };
    server.use(
      http.get('/api/families/:familyId/activity', () => HttpResponse.json(response)),
    );
    render$('family-1');
    await waitFor(() => expect(screen.getByText('log-1')).toBeInTheDocument());
  });

  it('surfaces error state when request fails', async () => {
    server.use(
      http.get('/api/families/:familyId/activity', () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 }),
      ),
    );
    render$('family-1');
    await waitFor(() => expect(screen.getByText('error')).toBeInTheDocument());
  });
});
