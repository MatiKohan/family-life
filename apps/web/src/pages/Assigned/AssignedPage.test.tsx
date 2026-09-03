import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { AssignedPage } from './AssignedPage';
import { useAuthStore } from '../../store/auth.store';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

function renderAssigned() {
  useAuthStore.getState().setSession(
    { id: 'user-1', email: 'a@b.com', name: 'Ada', avatarUrl: null },
    'tok',
  );
  server.use(
    http.get('/api/families/family-1/dashboard', () =>
      HttpResponse.json({
        todayEvents: [],
        assigned: {
          listItems: [
            { text: 'Milk', pageId: 'page-1', pageTitle: 'Groceries', pageEmoji: '🛒' },
          ],
          tasks: [
            {
              text: 'Call dentist',
              status: 'todo',
              pageId: 'page-2',
              pageTitle: 'Tasks',
              pageEmoji: '✅',
            },
          ],
          events: [],
        },
        openListItems: 1,
        leftoverPageId: 'page-1',
      }),
    ),
  );
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/family/family-1/assigned']}>
        <Routes>
          <Route path="/family/:id/assigned" element={<AssignedPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AssignedPage', () => {
  it('lists assigned list items and tasks as links', async () => {
    renderAssigned();
    await waitFor(() => expect(screen.getByText('Milk')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Milk/ })).toHaveAttribute(
      'href',
      '/family/family-1/pages/page-1',
    );
    expect(screen.getByText('Call dentist')).toBeInTheDocument();
  });
});
