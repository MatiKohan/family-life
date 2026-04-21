import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { SearchBar } from './SearchBar';
import { useAuthStore } from '../../store/auth.store';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

function renderBar() {
  useAuthStore
    .getState()
    .setSession({ id: 'u1', email: 'a@b.com', name: 'A', avatarUrl: null }, 'tok');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SearchBar familyId="fam-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SearchBar', () => {
  it('renders search input', () => {
    renderBar();
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('shows results after typing 2+ characters', async () => {
    const user = userEvent.setup();
    renderBar();
    await user.type(screen.getByPlaceholderText(/search/i), 'gr');
    await waitFor(() =>
      expect(screen.getByText(/page matching gr/i)).toBeInTheDocument(),
    );
  });

  it('does not search with less than 2 characters', async () => {
    const user = userEvent.setup();
    renderBar();
    await user.type(screen.getByPlaceholderText(/search/i), 'g');
    expect(screen.queryByText(/page matching/i)).not.toBeInTheDocument();
  });

  it('clears query on Escape', async () => {
    const user = userEvent.setup();
    renderBar();
    const input = screen.getByPlaceholderText(/search/i);
    await user.type(input, 'gr');
    await user.keyboard('{Escape}');
    expect(input).toHaveValue('');
  });

  it('shows no results message when API returns empty', async () => {
    server.use(
      http.get('/api/families/:familyId/search', () =>
        HttpResponse.json({ pages: [], items: [], tasks: [], events: [] }),
      ),
    );
    const user = userEvent.setup();
    renderBar();
    await user.type(screen.getByPlaceholderText(/search/i), 'xyz');
    await waitFor(() =>
      expect(screen.getByText(/no results/i)).toBeInTheDocument(),
    );
  });
});
