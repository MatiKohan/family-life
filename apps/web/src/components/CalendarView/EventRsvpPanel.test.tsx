import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { EventRsvpPanel } from './EventRsvpPanel';
import { server } from '../../mocks/server';
import { useAuthStore } from '../../store/auth.store';
import type { FamilyMember } from '../../types/family';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

const members: FamilyMember[] = [
  {
    id: 'm1',
    familyId: 'family-1',
    userId: 'user-1',
    role: 'OWNER',
    whatsappPhone: null,
    notificationSettings: {},
    joinedAt: '2026-01-01T00:00:00.000Z',
    user: { id: 'user-1', name: 'Test User', email: 'a@b.com', avatarUrl: null },
  },
];

function renderPanel() {
  useAuthStore.getState().setSession(
    { id: 'user-1', email: 'a@b.com', name: 'Test User', avatarUrl: null },
    'tok',
  );
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <EventRsvpPanel
          familyId="family-1"
          eventId="event-1"
          attendees={[{ userId: 'user-1', status: 'going', bringing: 'Cake' }]}
          members={members}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('EventRsvpPanel', () => {
  it('shows who is coming and lets the user change RSVP', async () => {
    renderPanel();
    expect(screen.getByText(/Who's coming/)).toBeInTheDocument();
    expect(screen.getByText(/Test User: Going/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Maybe' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Maybe' })).toBeEnabled());
  });
});
