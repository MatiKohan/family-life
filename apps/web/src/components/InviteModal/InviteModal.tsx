import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateInvite } from '../../hooks/useCreateInvite';
import { useInvites } from '../../hooks/useInvites';
import { useRevokeInvite } from '../../hooks/useRevokeInvite';

interface Props {
  familyId: string;
  onClose: () => void;
}

export function InviteModal({ familyId, onClose }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const createInvite = useCreateInvite(familyId);
  const { data: invites, isLoading: invitesLoading } = useInvites(familyId);
  const revokeInvite = useRevokeInvite(familyId);

  // Generate a link immediately on open
  useEffect(() => {
    createInvite.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleCopy() {
    if (!createInvite.data?.inviteUrl) return;
    await navigator.clipboard.writeText(createInvite.data.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t('invite.generateLink')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={t('common.close')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Generated link */}
          <div>
            {createInvite.isPending ? (
              <div className="space-y-2">
                <div className="h-9 bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-40" />
              </div>
            ) : createInvite.isError ? (
              <p className="text-sm text-red-600">{t('common.error')}</p>
            ) : createInvite.data ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createInvite.data.inviteUrl}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-700 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors shrink-0"
                  >
                    {copied ? t('invite.copied') : t('invite.copyLink')}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {t('invite.expiresOn', { date: formatDate(createInvite.data.expiresAt) })}
                </p>
              </div>
            ) : null}
          </div>

          {/* Active invites list */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              {t('invite.activeInvites')}
            </h3>
            {invitesLoading ? (
              <div className="space-y-2">
                <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              </div>
            ) : !invites || invites.length === 0 ? (
              <p className="text-sm text-gray-400">{t('invite.noActiveInvites')}</p>
            ) : (
              <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                {invites.map((invite) => (
                  <li key={invite.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <span className="text-sm text-gray-600 truncate">
                      {formatDate(invite.expiresAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => revokeInvite.mutate(invite.id)}
                      disabled={revokeInvite.isPending}
                      className="text-sm text-red-600 hover:text-red-700 font-medium shrink-0 disabled:opacity-50 transition-colors"
                    >
                      {t('invite.revokeInvite')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
