import { useAuthStore } from '../store/auth.store';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { accessToken: string };
  useAuthStore.getState().setAccessToken(data.accessToken);
  return data.accessToken;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = useAuthStore.getState().accessToken;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      useAuthStore.getState().clearSession();
      throw new Error('Unauthorized');
    }
    headers['Authorization'] = `Bearer ${newToken}`;
    const retryRes = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
    if (!retryRes.ok) throw new Error(await retryRes.text());
    return retryRes.json() as Promise<T>;
  }

  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
