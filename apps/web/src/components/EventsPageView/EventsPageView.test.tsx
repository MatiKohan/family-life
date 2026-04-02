import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { EventsPageView } from './EventsPageView';
import { Page } from '../../types/page';
import { CalendarEvent } from '../../types/calendar';
import { useAuthStore } from '../../store/auth.store';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 7);

const mockLinkedEvent: CalendarEvent = {
  id: 'ev-linked-1',
  familyId: 'family-1',
  title: 'Linked Birthday',
  description: null,
  startAt: futureDate.toISOString(),
  endAt: futureDate.toISOString(),
  isAllDay: false,
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const basePage: Page & { events?: CalendarEvent[] } = {
  id: 'page-events',
  familyId: 'family-1',
  title: 'Family Events',
  emoji: '📅',
  type: 'events',
  items: [],
  taskItems: [],
  eventIds: ['ev-linked-1'],
  events: [mockLinkedEvent],
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderView(page: typeof basePage = basePage) {
  useAuthStore.getState().setSession({ id: 'u1', email: 'a@b.com', name: 'A', avatarUrl: null }, 'tok');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <EventsPageView page={page} familyId="family-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('EventsPageView', () => {
  it('renders page title and emoji', () => {
    renderView();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Family Events');
    expect(screen.getByText('📅')).toBeInTheDocument();
  });

  it('renders linked events', () => {
    renderView();
    expect(screen.getByText('Linked Birthday')).toBeInTheDocument();
  });

  it('shows empty state when no events are linked', () => {
    renderView({ ...basePage, events: [], eventIds: [] });
    expect(screen.getByText(/no events linked yet/i)).toBeInTheDocument();
  });

  it('renders action buttons for linking and creating events', () => {
    renderView();
    expect(screen.getByRole('button', { name: /new event/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /link event/i })).toBeInTheDocument();
  });

  it('shows show past / hide past toggle button', () => {
    renderView();
    expect(screen.getByRole('button', { name: /show past/i })).toBeInTheDocument();
  });

  it('opens create event modal when new event button is clicked', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('button', { name: /new event/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /create event/i })).toBeInTheDocument(),
    );
  });

  it('opens link event modal when link event button is clicked', async () => {
    server.use(
      http.get('/api/families/:familyId/calendar', () => HttpResponse.json([])),
    );

    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('button', { name: /link event/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /pick an event/i })).toBeInTheDocument(),
    );
  });

  it('hides past events by default', () => {
    const pastDate = new Date('2020-01-01T00:00:00.000Z');
    const pastEvent: CalendarEvent = {
      ...mockLinkedEvent,
      id: 'ev-past',
      title: 'Past Event',
      startAt: pastDate.toISOString(),
      endAt: pastDate.toISOString(),
    };
    renderView({ ...basePage, events: [pastEvent], eventIds: ['ev-past'] });
    // Past event should not be visible by default
    expect(screen.queryByText('Past Event')).not.toBeInTheDocument();
  });

  it('shows past events after toggling show past', async () => {
    const pastDate = new Date('2020-01-01T00:00:00.000Z');
    const pastEvent: CalendarEvent = {
      ...mockLinkedEvent,
      id: 'ev-past',
      title: 'Past Event',
      startAt: pastDate.toISOString(),
      endAt: pastDate.toISOString(),
    };

    const user = userEvent.setup();
    renderView({ ...basePage, events: [pastEvent], eventIds: ['ev-past'] });

    await user.click(screen.getByRole('button', { name: /show past/i }));
    expect(screen.getByText('Past Event')).toBeInTheDocument();
  });
});
