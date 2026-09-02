import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { useAuthStore } from '../../store/auth.store';
import { CalendarSubscribeActions } from './CalendarSubscribeActions';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

function renderActions(showRegenerate = false) {
  useAuthStore.getState().setSession(
    { id: 'u1', email: 'a@b.com', name: 'A', avatarUrl: null },
    'tok',
  );
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CalendarSubscribeActions familyId="family-1" showRegenerate={showRegenerate} />
    </QueryClientProvider>,
  );
}

describe('CalendarSubscribeActions', () => {
  it('links Google and Apple calendars using the family token', async () => {
    renderActions();

    const google = await screen.findByRole('link', { name: /add to google calendar/i });
    const apple = screen.getByRole('link', { name: /add to apple calendar/i });

    expect(google).toHaveAttribute(
      'href',
      expect.stringContaining('calendar.google.com'),
    );
    expect(google.getAttribute('href')).toContain('mock-calendar-token');
    expect(apple.getAttribute('href')).toContain('webcal://');
    expect(apple.getAttribute('href')).toContain('mock-calendar-token');
  });

  it('hides regenerate unless requested', async () => {
    renderActions(false);
    await screen.findByRole('link', { name: /add to google calendar/i });
    expect(screen.queryByRole('button', { name: /reset link/i })).not.toBeInTheDocument();
  });

  it('shows regenerate when requested', async () => {
    renderActions(true);
    await screen.findByRole('button', { name: /reset link/i });
  });

  it('copies the webcal link', async () => {
    const user = userEvent.setup();
    renderActions();

    await user.click(await screen.findByRole('button', { name: /copy link/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument(),
    );
  });
});
