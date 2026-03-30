import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '../../store/auth.store';
import { server } from '../../mocks/server';
import { mockUser } from '../../mocks/handlers';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when not authenticated', () => {
    renderWithRouter();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user and accessToken are both present', () => {
    useAuthStore.getState().setSession(mockUser, 'token');
    renderWithRouter();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders nothing (null) while restoring session', () => {
    // Simulate reload: user in store, no accessToken
    useAuthStore.setState({ user: mockUser, accessToken: null });

    // Delay refresh response so restoring stays true during the check
    server.use(
      http.post('/api/auth/refresh', async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json({ accessToken: 'restored-token', user: mockUser });
      }),
    );

    renderWithRouter();
    // While the refresh is in-flight, neither page should be shown
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows protected content after session is successfully restored', async () => {
    useAuthStore.setState({ user: mockUser, accessToken: null });

    renderWithRouter();

    await waitFor(() =>
      expect(screen.getByText('Protected Content')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('redirects to /login when refresh fails during restore', async () => {
    useAuthStore.setState({ user: mockUser, accessToken: null });

    server.use(
      http.post('/api/auth/refresh', () =>
        new HttpResponse('Unauthorized', { status: 401 }),
      ),
    );

    renderWithRouter();

    await waitFor(() =>
      expect(screen.getByText('Login Page')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
