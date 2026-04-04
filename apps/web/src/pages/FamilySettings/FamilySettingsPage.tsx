import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../hooks/useFamily';
import { useAuthStore } from '../../store/auth.store';
import { useUpdateMyMember } from '../../hooks/useUpdateMyMember';
import { InviteModal } from '../../components/InviteModal/InviteModal';

const ROLE_BADGE: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MEMBER: 'bg-gray-100 text-gray-600',
};

export function FamilySettingsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const { data: family, isLoading } = useFamily(id);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [phone, setPhone] = useState('');
  const [itemAssignedEnabled, setItemAssignedEnabled] = useState(true);
  const updateMyMember = useUpdateMyMember(id!);

  const currentMember = family?.members.find((m) => m.user.id === currentUser?.id);
  const canInvite = currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN';

  useEffect(() => {
    if (currentMember) {
      setPhone(currentMember.whatsappPhone ?? '');
      setItemAssignedEnabled(currentMember.notificationSettings?.itemAssigned !== false);
    }
  }, [currentMember]);

  const handleSaveNotifications = () => {
    updateMyMember.mutate({
      whatsappPhone: phone || null,
      notificationSettings: { itemAssigned: itemAssignedEnabled },
    });
  };

  if (isLoading) {
    return (
      <main className="flex-1 p-6">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="h-8 bg-gray-100 rounded animate-pulse w-40" />
          <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </main>
    );
  }

  if (!family) return null;

  return (
    <main className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Family info */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900 mb-4">{t('family.settings')}</h1>
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-3xl">{family.emoji}</span>
            <div>
              <p className="font-medium text-gray-900">{family.name}</p>
              <p className="text-sm text-gray-500">
                {family._count?.members ?? family.members.length}{' '}
                {t('family.members').toLowerCase()}
              </p>
            </div>
          </div>

          {canInvite && (
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
            >
              {t('invite.inviteMember')}
            </button>
          )}
        </div>

        {/* Members list */}
        <div>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            {t('family.members')}
          </h2>
          <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {family.members.map((member) => (
              <li key={member.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-medium text-sm shrink-0">
                  {member.user.avatarUrl ? (
                    <img
                      src={member.user.avatarUrl}
                      alt={member.user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    member.user.name[0]?.toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {member.user.name}
                    {member.user.id === currentUser?.id && (
                      <span className="ml-1 text-gray-400 font-normal">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{member.user.email}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[member.role] ?? ROLE_BADGE.MEMBER}`}>
                  {member.role}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* My notifications */}
        {currentMember && (
          <div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              {t('notifications.myNotifications', 'My Notifications')}
            </h2>
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('notifications.whatsappPhone', 'WhatsApp phone')}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="mt-1 text-xs text-gray-400">
                  {t('notifications.phoneHint', 'Used for WhatsApp notifications')}
                </p>
              </div>

              {phone && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemAssignedEnabled}
                    onChange={(e) => setItemAssignedEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600"
                  />
                  <span className="text-sm text-gray-700">
                    {t('notifications.itemAssigned', "Notify me when I'm assigned an item")}
                  </span>
                </label>
              )}

              <button
                type="button"
                onClick={handleSaveNotifications}
                disabled={updateMyMember.isPending}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {updateMyMember.isPending
                  ? t('common.saving', 'Saving...')
                  : t('common.save', 'Save')}
              </button>

              {updateMyMember.isSuccess && (
                <p className="text-xs text-green-600 text-center">
                  {t('notifications.saved', 'Saved!')}
                </p>
              )}
              {updateMyMember.isError && (
                <p className="text-xs text-red-500 text-center">
                  {t('common.error', 'Something went wrong')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {showInviteModal && id && (
        <InviteModal familyId={id} onClose={() => setShowInviteModal(false)} />
      )}
    </main>
  );
}
