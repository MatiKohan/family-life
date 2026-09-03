import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { mockUser } from '../../mocks/handlers';
import { FamilySettingsPage } from './FamilySettingsPage';
import { useAuthStore } from '../../store/auth.store';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

const family = {
  id: 'family-1',
  name: 'The Smiths',
  emoji: '🏠',
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [
    {
      id: 'm1',
      familyId: 'family-1',
      userId: mockUser.id,
      role: 'OWNER',
      whatsappPhone: null,
      notificationSettings: {},
      joinedAt: '2026-01-01T00:00:00.000Z',
      user: {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        avatarUrl: null,
      },
    },
  ],
};

function renderSettings() {
  useAuthStore.getState().setSession(mockUser, 'tok');
  server.use(http.get('/api/families/family-1', () => HttpResponse.json(family)));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/family/family-1/settings']}>
        <Routes>
          <Route path="/family/:id/settings" element={<FamilySettingsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('FamilySettingsPage', () => {
  it('saves a new display name via PATCH /auth/me', async () => {
    const user = userEvent.setup();
    let patched: { name?: string } | null = null;
    server.use(
      http.patch('/api/auth/me', async ({ request }) => {
        patched = (await request.json()) as { name?: string };
        return HttpResponse.json({ ...mockUser, name: patched.name });
      }),
    );
    renderSettings();
    const input = await screen.findByLabelText('Name');
    await user.clear(input);
    await user.type(input, 'Mati');
    await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);
    await waitFor(() => expect(patched?.name).toBe('Mati'));
    expect(useAuthStore.getState().user?.name).toBe('Mati');
  });
});
