import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { apiRequest } from '../../lib/api-client';
import { AuthUser } from '@family-life/types';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    if (!accessToken) {
      navigate('/login', { replace: true });
      return;
    }

    // Temporarily store token to make the /me call
    useAuthStore.getState().setAccessToken(accessToken);

    apiRequest<AuthUser>('/auth/me')
      .then((user) => {
        setSession(user, accessToken);
        navigate('/', { replace: true });
      })
      .catch(() => {
        navigate('/login', { replace: true });
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Signing you in…</p>
    </div>
  );
}
