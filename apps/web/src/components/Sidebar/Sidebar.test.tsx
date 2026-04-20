import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { mockPageSummaries } from '../../mocks/handlers';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '../../store/auth.store';
import { useFamilyStore } from '../../store/family.store';
import type { Family } from '../../types/family';

const mockFamily: Family & { members: [] } = {
  id: 'family-1',
  name: 'The Smiths',
  emoji: '🏠',
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [],
};

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
  useFamilyStore.getState().clearActiveFamily();
});
afterAll(() => server.close());

function renderSidebar(initialPath = '/family/family-1') {
  useAuthStore
    .getState()
    .setSession({ id: 'user-1', email: 'test@example.com', name: 'Test User', avatarUrl: null }, 'mock-token');
  useFamilyStore.getState().setActiveFamily('family-1');

  server.use(
    http.get('/api/families', () => HttpResponse.json([mockFamily])),
    http.get('/api/families/family-1', () => HttpResponse.json(mockFamily)),
  );

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/family/:familyId/*" element={<Sidebar familyId="family-1" />} />
          <Route path="/family/:familyId/pages/:pageId" element={<Sidebar familyId="family-1" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Sidebar', () => {
  it('renders the page list from the API', async () => {
    renderSidebar();

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
    });
  });

  it('renders page emojis alongside page titles', async () => {
    renderSidebar();

    await waitFor(() => {
      expect(screen.getByText('🛒')).toBeInTheDocument();
      expect(screen.getByText('✅')).toBeInTheDocument();
    });
  });

  it('shows the "New page" button', async () => {
    renderSidebar();

    // The button text comes from t('pages.newPage') which resolves to '+ New Page'
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ new page/i })).toBeInTheDocument();
    });
  });

  it('highlights the active page based on the current route', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    useAuthStore
      .getState()
      .setSession({ id: 'user-1', email: 'test@example.com', name: 'Test User', avatarUrl: null }, 'mock-token');
    useFamilyStore.getState().setActiveFamily('family-1');

    server.use(
      http.get('/api/families', () => HttpResponse.json([mockFamily])),
      http.get('/api/families/family-1', () => HttpResponse.json(mockFamily)),
    );

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/family/family-1/pages/page-1']}>
          <Routes>
            <Route
              path="/family/:familyId/pages/:pageId"
              element={<Sidebar familyId="family-1" />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      const groceriesLink = screen.getByRole('link', { name: /groceries/i });
      // Active link gets bg-brand-50 and text-brand-700 classes
      expect(groceriesLink.className).toMatch(/bg-brand-50/);
    });
  });

  it('non-active pages do not have the active highlight class', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    useAuthStore
      .getState()
      .setSession({ id: 'user-1', email: 'test@example.com', name: 'Test User', avatarUrl: null }, 'mock-token');
    useFamilyStore.getState().setActiveFamily('family-1');

    server.use(
      http.get('/api/families', () => HttpResponse.json([mockFamily])),
      http.get('/api/families/family-1', () => HttpResponse.json(mockFamily)),
    );

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/family/family-1/pages/page-1']}>
          <Routes>
            <Route
              path="/family/:familyId/pages/:pageId"
              element={<Sidebar familyId="family-1" />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      const tasksLink = screen.getByRole('link', { name: /^✅\s*tasks$/i });
      expect(tasksLink.className).not.toMatch(/bg-brand-50/);
    });
  });

  it('clicking a page item navigates to that page URL', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    useAuthStore
      .getState()
      .setSession({ id: 'user-1', email: 'test@example.com', name: 'Test User', avatarUrl: null }, 'mock-token');
    useFamilyStore.getState().setActiveFamily('family-1');

    server.use(
      http.get('/api/families', () => HttpResponse.json([mockFamily])),
      http.get('/api/families/family-1', () => HttpResponse.json(mockFamily)),
    );

    const user = userEvent.setup();

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/family/family-1']}>
          <Routes>
            <Route path="/family/:familyId" element={<Sidebar familyId="family-1" />} />
            <Route
              path="/family/:familyId/pages/:pageId"
              element={<div data-testid="page-view">page view</div>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText('Groceries')).toBeInTheDocument());

    await user.click(screen.getByRole('link', { name: /groceries/i }));

    await waitFor(() => {
      expect(screen.getByTestId('page-view')).toBeInTheDocument();
    });
  });

  it('shows the family name in the switcher area', async () => {
    renderSidebar();

    await waitFor(() => {
      expect(screen.getByText('The Smiths')).toBeInTheDocument();
    });
  });

  it('shows the family emoji in the switcher area', async () => {
    renderSidebar();

    await waitFor(() => {
      // The FamilySwitcher renders the emoji as a span
      expect(screen.getByText('🏠')).toBeInTheDocument();
    });
  });

  it('shows a loading skeleton while pages are loading', async () => {
    // Delay the pages response so the skeleton is visible
    server.use(
      http.get('/api/families/family-1/pages', async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return HttpResponse.json(mockPageSummaries);
      }),
      http.get('/api/families', () => HttpResponse.json([mockFamily])),
      http.get('/api/families/family-1', () => HttpResponse.json(mockFamily)),
    );

    useAuthStore
      .getState()
      .setSession({ id: 'user-1', email: 'test@example.com', name: 'Test User', avatarUrl: null }, 'mock-token');
    useFamilyStore.getState().setActiveFamily('family-1');

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/family/family-1']}>
          <Routes>
            <Route path="/family/:familyId/*" element={<Sidebar familyId="family-1" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText('Loading pages')).toBeInTheDocument();
  });

  it('renders bottom nav links for Calendar, Activity, and Settings', async () => {
    renderSidebar();

    // These labels come from i18n: pages.calendar, activity.title, family.settings
    expect(screen.getByRole('link', { name: /calendar/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /activity/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });

  it('opens the create page modal when the new page button is clicked', async () => {
    renderSidebar();

    const user = userEvent.setup();

    const newPageButton = await screen.findByRole('button', { name: /\+ new page/i });
    await user.click(newPageButton);

    // The CreatePageModal renders a heading with the createTitle text
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /new page/i })).toBeInTheDocument();
    });
  });

  it('renders pages section label', async () => {
    renderSidebar();

    // t('pages.pages') resolves to 'Pages'
    await waitFor(() => {
      expect(screen.getByText('Pages')).toBeInTheDocument();
    });
  });

  it('does not render folder items when no folders exist', async () => {
    // mockFolders is [] by default, so no folder-related elements should appear
    renderSidebar();

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /drag folder to reorder/i })).not.toBeInTheDocument();
  });
});
