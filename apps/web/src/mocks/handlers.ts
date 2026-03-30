import { http, HttpResponse } from 'msw';
import type { AuthUser } from '@my-app/types';

export const mockUser: AuthUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: null,
};

export const handlers = [
  http.get('/api/health', () => HttpResponse.json({ status: 'ok' })),
  http.get('/api/auth/me', () => HttpResponse.json(mockUser)),
  http.post('/api/auth/refresh', () =>
    HttpResponse.json({ accessToken: 'new-mock-token', user: mockUser }),
  ),
  http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })),
];
