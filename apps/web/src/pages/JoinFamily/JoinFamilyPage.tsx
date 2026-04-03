import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { useFamilyStore } from '../../store/family.store';
import { apiRequest } from '../../lib/api-client';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

interface InviteInfo {
  familyName: string;
  familyEmoji: string;
}

interface JoinResponse {
  familyId: string;
  familyName: string;
}

interface RequiresAuthResponse {
  requiresAuth: true;
  token: string;
}

// ── Invite preview shown to unauthenticated users ──────────────────────────

function InvitePreview({ token }: { token: string }) {
  const { t } = useTranslation();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/invites/info/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<InviteInfo>;
      })
      .then(setInfo)
      .catch(() => setInvalid(true));
  }, [token]);

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-4xl mb-4">😕</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t('invite.inviteNotValid')}</h1>
          <p className="text-gray-500 text-sm mb-6">{t('invite.expiredOrInvalid')}</p>
          <Link to="/login" className="inline-block bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-700 transition-colors">
            {t('invite.goHome')}
          </Link>
        </div>
      </div>
    );
  }

  if (!info) {
    // Loading skeleton
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-pulse">
          <div className="w-16 h-16 rounded-full bg-gray-200 mx-auto mb-4" />
          <div className="h-5 bg-gray-200 rounded w-3/4 mx-auto mb-2" />
          <div className="h-4 bg-gray-100 rounded w-1/2 mx-auto mb-8" />
          <div className="h-10 bg-gray-200 rounded-lg mb-3" />
          <div className="h-10 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="text-5xl mb-4">{info.familyEmoji}</div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">{t('invite.youreInvited')}</h1>
        <p className="text-gray-500 text-sm mb-8">
          {t('invite.joinFamily', { familyName: info.familyName })}
        </p>

        <div className="space-y-3">
          <Link
            to={`/login?redirect=/join/${token}&mode=register`}
            className="block w-full bg-brand-600 text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            {t('invite.createAccountToJoin')}
          </Link>
          <Link
            to={`/login?redirect=/join/${token}&mode=login`}
            className="block w-full border border-gray-300 text-gray-700 rounded-lg px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {t('invite.signInToJoin')}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main page — redeems invite if logged in, shows preview otherwise ────────

export function JoinFamilyPage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setActiveFamily = useFamilyStore((s) => s.setActiveFamily);

  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!user) return; // handled by InvitePreview branch below
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid invite link.');
      return;
    }

    let cancelled = false;

    async function joinFamily() {
      try {
        const data = await apiRequest<JoinResponse | RequiresAuthResponse>(
          `/invites/join/${token}`,
          { method: 'POST' },
        );
        if (cancelled) return;

        if ('requiresAuth' in data && data.requiresAuth) {
          navigate(`/login?redirect=/join/${token}`, { replace: true });
          return;
        }

        const joined = data as JoinResponse;
        setActiveFamily(joined.familyId);
        navigate(`/family/${joined.familyId}`, { replace: true });
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setErrorMessage(err instanceof Error ? err.message : t('invite.tryAgain'));
        }
      }
    }

    void joinFamily();
    return () => { cancelled = true; };
  }, [token, user, navigate, setActiveFamily, t]);

  // Not logged in → show invite preview with sign-in / register options
  if (!user) {
    if (!token) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="text-center">
            <p className="text-gray-500 text-sm">{t('invite.inviteNotValid')}</p>
            <Link to="/" className="text-brand-600 text-sm font-medium mt-2 inline-block">{t('invite.goHome')}</Link>
          </div>
        </div>
      );
    }
    return <InvitePreview token={token} />;
  }

  // Logged in → loading while auto-redeeming
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="text-4xl mb-4">😕</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{t('invite.inviteNotValid')}</h1>
        <p className="text-gray-500 text-sm mb-6">{errorMessage}</p>
        <Link to="/" className="inline-block bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-700 transition-colors">
          {t('invite.goHome')}
        </Link>
      </div>
    </div>
  );
}
