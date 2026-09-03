import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import i18n from 'i18next';
import { server } from '../../mocks/server';
import { mockUser } from '../../mocks/handlers';
import { FamilyShell } from './FamilyShell';
import { useAuthStore } from '../../store/auth.store';
import { useFamilyStore } from '../../store/family.store';
import he from '../../i18n/locales/he.json';

class FakeEventSource {
  onmessage: ((ev: MessageEvent) => void) | null = null;
  close() {}
}
vi.stubGlobal('EventSource', FakeEventSource);

const mockFamily = {
  id: 'family-1',
  name: 'The Smiths',
  emoji: '🏠',
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [],
};

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
  i18n.addResourceBundle('he', 'translation', he, true, true);
});
afterEach(async () => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
  useFamilyStore.getState().clearActiveFamily();
  await i18n.changeLanguage('en');
});
afterAll(() => server.close());

function renderShell() {
  useAuthStore.getState().setSession(mockUser, 'token');
  useFamilyStore.getState().setActiveFamily('family-1');
  server.use(
    http.get('/api/families', () => HttpResponse.json([mockFamily])),
    http.get('/api/families/family-1', () => HttpResponse.json(mockFamily)),
  );
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/family/family-1']}>
        <Routes>
          <Route path="/family/:id" element={<FamilyShell />}>
            <Route index element={<div>Home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('FamilyShell', () => {
  it('shows a Hebrew cancel control when mobile search is open', async () => {
    await i18n.changeLanguage('he');
    renderShell();
    await userEvent.click(screen.getByRole('button', { name: 'חיפוש' }));
    expect(screen.getByRole('button', { name: 'ביטול' })).toBeInTheDocument();
  });
});
