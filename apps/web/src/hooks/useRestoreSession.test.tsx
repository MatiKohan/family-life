import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useRestoreSession } from './useRestoreSession';
import { useAuthStore } from '../store/auth.store';
import { server } from '../mocks/server';
import { mockUser } from '../mocks/handlers';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clearSession();
});
afterAll(() => server.close());

describe('useRestoreSession', () => {
  it('returns restoring=false immediately when no user in store', () => {
    const { result } = renderHook(() => useRestoreSession());
    expect(result.current.restoring).toBe(false);
  });

  it('returns restoring=false immediately when user and accessToken are both present', () => {
    useAuthStore.getState().setSession(mockUser, 'existing-token');
    const { result } = renderHook(() => useRestoreSession());
    expect(result.current.restoring).toBe(false);
  });

  it('starts restoring=true when user exists but accessToken is null, then sets session on success', async () => {
    // Simulate page reload: user restored from localStorage, accessToken absent
    useAuthStore.setState({ user: mockUser, accessToken: null });

    const { result } = renderHook(() => useRestoreSession());

    expect(result.current.restoring).toBe(true);

    await waitFor(() => expect(result.current.restoring).toBe(false));

    expect(useAuthStore.getState().accessToken).toBe('new-mock-token');
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('clears session and stops restoring when refresh fails', async () => {
    useAuthStore.setState({ user: mockUser, accessToken: null });

    server.use(
      http.post('/api/auth/refresh', () =>
        new HttpResponse('Unauthorized', { status: 401 }),
      ),
    );

    const { result } = renderHook(() => useRestoreSession());

    expect(result.current.restoring).toBe(true);

    await waitFor(() => expect(result.current.restoring).toBe(false));

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
