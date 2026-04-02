import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { CalendarView } from './CalendarView';
import { useAuthStore } from '../../store/auth.store';
import { mockCalendarEvents } from '../../mocks/handlers';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

function renderView() {
  useAuthStore.getState().setSession({ id: 'u1', email: 'a@b.com', name: 'A', avatarUrl: null }, 'tok');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CalendarView familyId="family-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CalendarView', () => {
  it('renders month navigation buttons and today button', () => {
    renderView();
    expect(screen.getByRole('button', { name: /previous month/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next month/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
  });

  it('renders the new event button', () => {
    renderView();
    // Text contains "+ New Event"
    expect(screen.getByRole('button', { name: /new event/i })).toBeInTheDocument();
  });

  it('renders day name headers (Sun through Sat)', () => {
    renderView();
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('displays events from the API as pills', async () => {
    renderView();
    // Pills render as buttons with the event title in their accessible name / title attribute
    await waitFor(() =>
      expect(screen.getByTitle(mockCalendarEvents[0].title)).toBeInTheDocument(),
    );
    expect(screen.getByTitle(mockCalendarEvents[1].title)).toBeInTheDocument();
  });

  it('opens create modal when + New Event is clicked', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('button', { name: /new event/i }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /create event/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole('textbox', { name: /event title/i })).toBeInTheDocument();
  });

  it('submits create event form and calls the API', async () => {
    let postedBody: Record<string, unknown> | undefined;
    server.use(
      http.post('/api/families/family-1/calendar', async ({ request }) => {
        postedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { ...mockCalendarEvents[0], id: 'ev-created', title: 'My New Event' },
          { status: 201 },
        );
      }),
    );

    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('button', { name: /new event/i }));
    await waitFor(() => screen.getByRole('heading', { name: /create event/i }));

    const titleInput = screen.getByRole('textbox', { name: /event title/i });
    await user.type(titleInput, 'My New Event');

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(postedBody?.title).toBe('My New Event'));
  });

  it('opens event detail modal when an event pill is clicked', async () => {
    const user = userEvent.setup();
    renderView();

    // Wait for the all-day event pill (School Meeting has title attribute)
    await waitFor(() =>
      expect(screen.getByTitle(mockCalendarEvents[1].title)).toBeInTheDocument(),
    );

    await user.click(screen.getByTitle(mockCalendarEvents[1].title));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: mockCalendarEvents[1].title })).toBeInTheDocument(),
    );
  });

  it('navigates to previous month when prev button is clicked', async () => {
    const user = userEvent.setup();
    renderView();

    // The month heading is an h2 element
    const heading = screen.getByRole('heading', { level: 2 });
    const currentText = heading.textContent ?? '';

    await user.click(screen.getByRole('button', { name: /previous month/i }));

    // After clicking, the month label should change
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 }).textContent).not.toBe(currentText);
    });
  });

  it('shows no-events message when calendar returns empty array', async () => {
    server.use(
      http.get('/api/families/:familyId/calendar', () => HttpResponse.json([])),
    );
    renderView();
    await waitFor(() =>
      expect(screen.getByText(/no events this month/i)).toBeInTheDocument(),
    );
  });
});
