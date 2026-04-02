import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../hooks/useFamily';
import { useAuthStore } from '../../store/auth.store';

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
      </div>
    </main>
  );
}
