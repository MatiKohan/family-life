import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFamilyStore } from '../../store/family.store';

type JoinStatus = 'loading' | 'success' | 'error';

interface JoinResponse {
  familyId: string;
  familyName: string;
}

export function JoinFamilyPage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const setActiveFamily = useFamilyStore((s) => s.setActiveFamily);

  const [status, setStatus] = useState<JoinStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid invite link.');
      return;
    }

    let cancelled = false;

    async function joinFamily() {
      try {
        const res = await fetch(`/api/invites/join/${token}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (cancelled) return;

        if (res.status === 401) {
          const body = (await res.json()) as { requiresAuth?: boolean };
          if (body.requiresAuth) {
            navigate(`/login?redirect=/join/${token}`, { replace: true });
            return;
          }
          setStatus('error');
          setErrorMessage('You must be logged in to join this family.');
          return;
        }

        if (!res.ok) {
          const text = await res.text();
          setStatus('error');
          setErrorMessage(text || 'This invite is expired or invalid.');
          return;
        }

        const data = (await res.json()) as JoinResponse;
        if (cancelled) return;

        setActiveFamily(data.familyId);
        navigate(`/family/${data.familyId}`, {
          replace: true,
          state: { toast: `Welcome to ${data.familyName}!` },
        });
      } catch {
        if (!cancelled) {
          setStatus('error');
          setErrorMessage('Something went wrong. Please try again.');
        }
      }
    }

    void joinFamily();

    return () => {
      cancelled = true;
    };
  }, [token, navigate, setActiveFamily]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">{t('invite.joining')}</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-4xl mb-4">😕</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t('invite.invalidToken')}</h1>
          <p className="text-gray-500 text-sm mb-6">{errorMessage}</p>
          <Link
            to="/"
            className="inline-block bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            {t('invite.goHome')}
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
