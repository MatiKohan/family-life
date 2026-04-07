import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../hooks/useFamily';
import { useAuthStore } from '../../store/auth.store';
import { useUpdateMyMember } from '../../hooks/useUpdateMyMember';
import { useUpdateMemberRole } from '../../hooks/useUpdateMemberRole';
import { useUpdateFamily } from '../../hooks/useUpdateFamily';
import { usePushSubscription } from '../../hooks/usePushSubscription';
import { InviteModal } from '../../components/InviteModal/InviteModal';
import type { FamilyRole } from '../../types/family';

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
  const [editingFamily, setEditingFamily] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [familyEmoji, setFamilyEmoji] = useState('');

  const [phone, setPhone] = useState('');
  const [itemAssignedEnabled, setItemAssignedEnabled] = useState(true);
  const [eventReminderEnabled, setEventReminderEnabled] = useState(true);
  const updateMyMember = useUpdateMyMember(id!);
  const updateMemberRole = useUpdateMemberRole(id!);
  const updateFamily = useUpdateFamily(id!);

  const { isSupported: pushSupported, permission: pushPermission, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushSubscription();

  const currentMember = family?.members.find((m) => m.user.id === currentUser?.id);
  const canInvite = currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN';
  const canManageRoles = currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN';

  useEffect(() => {
    if (currentMember) {
      setPhone(currentMember.whatsappPhone ?? '');
      setItemAssignedEnabled(currentMember.notificationSettings?.itemAssigned !== false);
      setEventReminderEnabled(currentMember.notificationSettings?.eventReminder !== false);
    }
  }, [currentMember]);

  const handleSaveNotifications = () => {
    updateMyMember.mutate({
      whatsappPhone: phone || null,
      notificationSettings: { itemAssigned: itemAssignedEnabled, eventReminder: eventReminderEnabled },
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
        <div className="space-y-3">
          <h1 className="text-xl font-semibold text-gray-900">{t('family.settings')}</h1>

          {editingFamily ? (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={familyEmoji}
                  onChange={(e) => setFamilyEmoji(e.target.value)}
                  className="w-14 text-3xl text-center border border-gray-200 rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  maxLength={2}
                />
                <input
                  autoFocus
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder={t('family.namePlaceholder', 'Family name')}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingFamily(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  disabled={!familyName.trim() || updateFamily.isPending}
                  onClick={() => {
                    updateFamily.mutate(
                      { name: familyName.trim(), emoji: familyEmoji },
                      { onSuccess: () => setEditingFamily(false) },
                    );
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {updateFamily.isPending ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
              <span className="text-3xl">{family.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{family.name}</p>
                <p className="text-sm text-gray-500">
                  {family._count?.members ?? family.members.length}{' '}
                  {t('family.members').toLowerCase()}
                </p>
              </div>
              {currentMember?.role === 'OWNER' && (
                <button
                  type="button"
                  onClick={() => { setFamilyName(family.name); setFamilyEmoji(family.emoji); setEditingFamily(true); }}
                  className="text-xs text-gray-400 hover:text-brand-600 transition-colors px-2 py-1 rounded hover:bg-brand-50"
                >
                  {t('common.edit', 'Edit')}
                </button>
              )}
            </div>
          )}

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
            {family.members.map((member) => {
              const isSelf = member.user.id === currentUser?.id;
              const isOwner = member.role === 'OWNER';
              const canChangeRole = canManageRoles && !isSelf && !isOwner;

              return (
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
                      {isSelf && (
                        <span className="ms-1 text-gray-400 font-normal">({t('family.you', 'you')})</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{member.user.email}</p>
                  </div>
                  {canChangeRole ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        updateMemberRole.mutate({ userId: member.user.id, role: e.target.value as FamilyRole })
                      }
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    >
                      <option value="MEMBER">{t('family.roleMember', 'Member')}</option>
                      <option value="ADMIN">{t('family.roleAdmin', 'Admin')}</option>
                    </select>
                  ) : (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[member.role] ?? ROLE_BADGE.MEMBER}`}>
                      {t(`family.role${member.role.charAt(0) + member.role.slice(1).toLowerCase()}`, member.role)}
                    </span>
                  )}
                </li>
              );
            })}
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
                <div className="space-y-2">
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
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventReminderEnabled}
                      onChange={(e) => setEventReminderEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-600"
                    />
                    <span className="text-sm text-gray-700">
                      {t('notifications.eventReminder', 'Send me calendar event reminders')}
                    </span>
                  </label>
                </div>
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

              {pushSupported && (
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    {t('notifications.pushNotifications', 'Push Notifications')}
                  </p>
                  {pushPermission === 'denied' ? (
                    <p className="text-xs text-gray-400">
                      {t('notifications.pushDenied', 'Notifications are blocked in your browser settings')}
                    </p>
                  ) : (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isSubscribed}
                        disabled={pushLoading}
                        onClick={() => isSubscribed ? unsubscribe() : subscribe()}
                        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 ${isSubscribed ? 'bg-brand-600' : 'bg-gray-200'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isSubscribed ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </button>
                      <span className="text-sm text-gray-700">
                        {pushLoading
                          ? t('notifications.pushSubscribing', 'Enabling...')
                          : t('notifications.pushToggle', 'Notify me on this device')}
                      </span>
                    </label>
                  )}
                </div>
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
