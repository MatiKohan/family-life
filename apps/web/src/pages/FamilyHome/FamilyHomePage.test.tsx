import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { FamilyHomePage } from './FamilyHomePage';
import { useAuthStore } from '../../store/auth.store';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

function renderHome() {
  useAuthStore.getState().setSession(
    { id: 'user-1', email: 'a@b.com', name: 'Ada Lovelace', avatarUrl: null },
    'tok',
  );
  server.use(
    http.get('/api/families/family-1', () =>
      HttpResponse.json({
        id: 'family-1',
        name: 'The Smiths',
        emoji: '🏠',
        createdAt: '2026-01-01T00:00:00.000Z',
        members: [],
      }),
    ),
    http.get('/api/families/family-1/dashboard', () =>
      HttpResponse.json({
        todayEvents: [
          {
            id: 'e1',
            title: 'Dinner',
            startAt: new Date().toISOString(),
            endAt: new Date().toISOString(),
            isAllDay: false,
            assigneeId: null,
          },
        ],
        assigned: {
          listItems: [
            { text: 'Milk', pageId: 'page-1', pageTitle: 'Groceries', pageEmoji: '🛒' },
          ],
          tasks: [],
          events: [],
        },
        openListItems: 3,
      }),
    ),
  );
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/family/family-1']}>
        <Routes>
          <Route path="/family/:id" element={<FamilyHomePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('FamilyHomePage', () => {
  it('shows today events, assigned preview, and leftover groceries', async () => {
    renderHome();
    await waitFor(() => expect(screen.getByText('Dinner')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('3 leftover items')).toBeInTheDocument();
  });
});
