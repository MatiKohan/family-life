import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { usePage } from './usePage';
import { useAuthStore } from '../store/auth.store';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

function TestComponent({ familyId, pageId }: { familyId: string | undefined; pageId: string | undefined }) {
  const { data, isLoading, isError } = usePage(familyId, pageId);
  if (isLoading) return <div>loading</div>;
  if (isError) return <div>error</div>;
  return <div>{data?.title ?? 'no data'}</div>;
}

function render$(familyId: string | undefined, pageId: string | undefined) {
  useAuthStore.getState().setSession({ id: 'u1', email: 'a@b.com', name: 'A', avatarUrl: null }, 'tok');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TestComponent familyId={familyId} pageId={pageId} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('usePage', () => {
  it('fetches the page when both ids provided', async () => {
    render$('family-1', 'page-1');
    await waitFor(() => expect(screen.getByText('Groceries')).toBeInTheDocument());
  });

  it('does not fetch when familyId is missing', () => {
    render$(undefined, 'page-1');
    expect(screen.queryByText('loading')).not.toBeInTheDocument();
  });

  it('does not fetch when pageId is missing', () => {
    render$('family-1', undefined);
    expect(screen.queryByText('loading')).not.toBeInTheDocument();
  });

  it('surfaces error state when request fails', async () => {
    server.use(
      http.get('/api/families/:familyId/pages/:pageId', () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 }),
      ),
    );
    render$('family-1', 'page-1');
    await waitFor(() => expect(screen.getByText('error')).toBeInTheDocument());
  });
});
