import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { usePages } from './usePages';
import { useAuthStore } from '../store/auth.store';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

function TestComponent({ familyId }: { familyId: string | undefined }) {
  const { data, isLoading, isError } = usePages(familyId);
  if (isLoading) return <div>loading</div>;
  if (isError) return <div>error</div>;
  return (
    <ul>
      {data?.map((p) => (
        <li key={p._id}>{p.title}</li>
      ))}
    </ul>
  );
}

function render$(familyId: string | undefined) {
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

describe('usePages', () => {
  it('returns page summaries when familyId is provided', async () => {
    render$('family-1');
    await waitFor(() => expect(screen.getByText('Groceries')).toBeInTheDocument());
    expect(screen.getByText('Tasks')).toBeInTheDocument();
  });

  it('does not fetch when familyId is undefined', () => {
    render$(undefined);
    // loading should never appear because query is disabled
    expect(screen.queryByText('loading')).not.toBeInTheDocument();
  });

  it('surfaces error state when request fails', async () => {
    server.use(
      http.get('/api/families/:familyId/pages', () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 }),
      ),
    );
    render$('family-1');
    await waitFor(() => expect(screen.getByText('error')).toBeInTheDocument());
  });
});
