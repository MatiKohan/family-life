import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useFolders } from './useFolders';
import { useAuthStore } from '../store/auth.store';
import { FolderSummary } from '../types/page';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

function TestComponent({ familyId }: { familyId: string | undefined }) {
  const { data, isLoading, isError } = useFolders(familyId);
  if (isLoading) return <div>loading</div>;
  if (isError) return <div>error</div>;
  return (
    <ul>
      {data?.map((f) => (
        <li key={f.id}>{f.name}</li>
      ))}
      {data?.length === 0 && <li>empty</li>}
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

describe('useFolders', () => {
  it('returns empty array when no folders exist', async () => {
    render$('family-1');
    await waitFor(() => expect(screen.getByText('empty')).toBeInTheDocument());
  });

  it('returns folder list when folders exist', async () => {
    const mockFolder: FolderSummary = {
      id: 'folder-1',
      name: 'Work',
      emoji: '💼',
      sortOrder: 0,
      pages: [],
    };
    server.use(
      http.get('/api/families/:familyId/folders', () =>
        HttpResponse.json([mockFolder]),
      ),
    );
    render$('family-1');
    await waitFor(() => expect(screen.getByText('Work')).toBeInTheDocument());
  });

  it('does not fetch when familyId is undefined', () => {
    render$(undefined);
    expect(screen.queryByText('loading')).not.toBeInTheDocument();
  });

  it('surfaces error state when request fails', async () => {
    server.use(
      http.get('/api/families/:familyId/folders', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 }),
      ),
    );
    render$('family-1');
    await waitFor(() => expect(screen.getByText('error')).toBeInTheDocument());
  });
});
