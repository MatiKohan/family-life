import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { ApartmentsPageView } from './ApartmentsPageView';
import { useAuthStore } from '../../store/auth.store';
import { Page } from '../../types/page';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

const mockApartmentsPage: Page = {
  id: 'page-apts',
  familyId: 'family-1',
  title: 'Apartment Hunt',
  emoji: '🏠',
  type: 'apartments',
  items: [],
  taskItems: [],
  eventIds: [],
  apartmentListings: [],
  metadata: { dealType: 'rent' },
  lastSyncedAt: null,
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockApartmentsPageWithListings: Page = {
  ...mockApartmentsPage,
  apartmentListings: [
    {
      id: 'listing-1',
      title: 'הקישון, פלורנטין, Tel Aviv',
      price: 4500,
      rooms: 3,
      floor: 2,
      area: 'פלורנטין',
      city: 'Tel Aviv',
      url: 'https://yad2.co.il/item/1',
      imageUrl: null,
      description: 'Great apartment',
      provider: 'yad2-apify',
      foundAt: '2026-01-01T00:00:00.000Z',
      seenBy: [],
    },
  ],
};

function renderView(page: Page = mockApartmentsPage) {
  useAuthStore.getState().setSession({ id: 'user-1', email: 'a@b.com', name: 'A', avatarUrl: null }, 'tok');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['pages', 'family-1', 'page-apts'], page);
  server.use(
    http.get('/api/families/family-1/pages/page-apts', () => HttpResponse.json(page)),
  );
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ApartmentsPageView familyId="family-1" pageId="page-apts" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ApartmentsPageView', () => {
  it('renders the page title', () => {
    renderView();
    expect(screen.getByText('Apartment Hunt')).toBeInTheDocument();
  });

  it('shows empty state when no listings', () => {
    renderView();
    expect(screen.getByText(/no listings yet/i)).toBeInTheDocument();
  });

  it('renders listing cards when listings exist', () => {
    renderView(mockApartmentsPageWithListings);
    expect(screen.getByText('הקישון, פלורנטין, Tel Aviv')).toBeInTheDocument();
    expect(screen.getByText(/₪4,500/)).toBeInTheDocument();
    expect(screen.getByText(/3 rooms/i)).toBeInTheDocument();
  });

  it('shows a "View listing" link for each listing', () => {
    renderView(mockApartmentsPageWithListings);
    const link = screen.getByRole('link', { name: /view listing/i });
    expect(link).toHaveAttribute('href', 'https://yad2.co.il/item/1');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('grays out listings already seen by current user', () => {
    const pageWithSeenListing: Page = {
      ...mockApartmentsPageWithListings,
      apartmentListings: [
        { ...mockApartmentsPageWithListings.apartmentListings[0], seenBy: ['user-1'] },
      ],
    };
    renderView(pageWithSeenListing);
    const card = screen.getByText('הקישון, פלורנטין, Tel Aviv').closest('.bg-white');
    expect(card).toHaveClass('opacity-40');
  });

  it('shows filter fields always visible', () => {
    renderView();
    expect(screen.getByPlaceholderText('Tel Aviv')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('8000')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/פלורנטין/)).toBeInTheDocument();
  });

  it('renders feature toggles', () => {
    renderView();
    expect(screen.getByRole('button', { name: /parking/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /balcony/i })).toBeInTheDocument();
  });

  it('renders Save & Search button', () => {
    renderView();
    expect(screen.getByRole('button', { name: /save & search/i })).toBeInTheDocument();
  });

  it('shows listing count when listings exist', () => {
    renderView(mockApartmentsPageWithListings);
    expect(screen.getByText(/1 listings/i)).toBeInTheDocument();
  });
});
