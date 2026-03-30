import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './Layout';
import { useAuthStore } from '../../store/auth.store';
import { server } from '../../mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: null,
};

function renderLayout() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Layout', () => {
  describe('hamburger menu', () => {
    it('renders a hamburger button', () => {
      useAuthStore.getState().setSession(mockUser, 'token');
      renderLayout();
      expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
    });

    it('toggles mobile nav when hamburger button is clicked', async () => {
      const user = userEvent.setup();
      useAuthStore.getState().setSession(mockUser, 'token');
      renderLayout();

      const hamburger = screen.getByRole('button', { name: /open menu/i });

      // Nav links inside mobile dropdown are not visible before opening
      expect(screen.queryByRole('navigation', { name: /mobile navigation/i })).not.toBeInTheDocument();

      // Open menu
      await user.click(hamburger);
      expect(screen.getByRole('navigation', { name: /mobile navigation/i })).toBeInTheDocument();

      // Button label updates to "Close menu"
      expect(screen.getByRole('button', { name: /close menu/i })).toBeInTheDocument();
    });

    it('closes the menu when a nav link is clicked', async () => {
      const user = userEvent.setup();
      useAuthStore.getState().setSession(mockUser, 'token');
      renderLayout();

      // Open menu
      await user.click(screen.getByRole('button', { name: /open menu/i }));
      expect(screen.getByRole('navigation', { name: /mobile navigation/i })).toBeInTheDocument();

      // Click a nav link
      const homeLinks = screen.getAllByRole('link', { name: /home/i });
      await user.click(homeLinks[homeLinks.length - 1]);

      // Menu closes
      expect(screen.queryByRole('navigation', { name: /mobile navigation/i })).not.toBeInTheDocument();
    });
  });
});
