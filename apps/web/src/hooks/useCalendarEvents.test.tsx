import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useCalendarEvents } from './useCalendarEvents';
import { useAuthStore } from '../store/auth.store';
import { mockCalendarEvents } from '../mocks/handlers';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

function TestComponent({
  familyId,
  start,
  end,
}: {
  familyId: string | undefined;
  start: string;
  end: string;
}) {
  const { data, isLoading, isError } = useCalendarEvents(familyId, start, end);
  if (isLoading) return <div>loading</div>;
  if (isError) return <div>error</div>;
  return (
    <ul>
      {data?.map((ev) => (
        <li key={ev.id}>{ev.title}</li>
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
        <TestComponent
          familyId={familyId}
          start="2026-04-01T00:00:00.000Z"
          end="2026-04-30T23:59:59.000Z"
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('useCalendarEvents', () => {
  it('returns events when familyId is provided', async () => {
    render$('family-1');
    await waitFor(() => expect(screen.getByText(mockCalendarEvents[0].title)).toBeInTheDocument());
    expect(screen.getByText(mockCalendarEvents[1].title)).toBeInTheDocument();
  });

  it('does not fetch when familyId is undefined', () => {
    render$(undefined);
    expect(screen.queryByText('loading')).not.toBeInTheDocument();
  });

  it('surfaces error state when request fails', async () => {
    server.use(
      http.get('/api/families/:familyId/calendar', () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 }),
      ),
    );
    render$('family-1');
    await waitFor(() => expect(screen.getByText('error')).toBeInTheDocument());
  });
});
