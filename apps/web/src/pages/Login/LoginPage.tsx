import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { apiRequest } from '../../lib/api-client';
import { AuthUser } from '@family-life/types';

type Mode = 'login' | 'register';

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

const isDev = new URLSearchParams(window.location.search).has('dev');

const DEV_PRESET = { email: 'dev@example.com', password: 'password123', name: 'Dev User' };

export function LoginPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/';

  const [mode, setMode] = useState<Mode>(
    searchParams.get('mode') === 'register' ? 'register' : 'login',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function fillDev() {
    setEmail(DEV_PRESET.email);
    setPassword(DEV_PRESET.password);
    if (mode === 'register') setName(DEV_PRESET.name);
  }

  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [user, navigate, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const body = mode === 'register'
        ? { email, password, name }
        : { email, password };

      const res = await apiRequest<AuthResponse>(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      setSession(res.user, res.accessToken);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      if (mode === 'login' && message.toLowerCase().includes('invalid credentials')) {
        setError('__no_account__');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Family Life</h1>
          <p className="text-gray-500 text-sm">{t('auth.signInToContinue')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">{t('auth.name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder={t('auth.namePlaceholder')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t('auth.emailPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder={t('auth.passwordPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && error !== '__no_account__' && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {error === '__no_account__' && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              {t('auth.noAccountFound')}{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); }}
                className="font-medium underline hover:text-amber-900"
              >
                {t('auth.createOne')}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {loading ? '...' : mode === 'login' ? t('auth.signIn') : t('auth.createAccount')}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-500">
          {mode === 'login' ? (
            <>{t('auth.noAccount')}{' '}
              <button type="button" onClick={() => setMode('register')} className="text-brand-600 font-medium hover:underline">
                {t('auth.register')}
              </button>
            </>
          ) : (
            <>{t('auth.hasAccount')}{' '}
              <button type="button" onClick={() => setMode('login')} className="text-brand-600 font-medium hover:underline">
                {t('auth.signIn')}
              </button>
            </>
          )}
        </div>

        <div className="mt-4 text-center">
          <a
            href="/api/auth/google"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('auth.signInWithGoogle')}
          </a>
        </div>

        {isDev && (
          <button
            type="button"
            onClick={fillDev}
            className="mt-4 w-full px-3 py-2 text-xs font-mono border border-dashed border-amber-400 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
          >
            [dev] fill
          </button>
        )}
      </div>
    </div>
  );
}
