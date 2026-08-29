import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { EventAttendee, EventRsvpStatus } from '@family-life/types';
import { apiRequest } from '../../lib/api-client';
import { queryKeys } from '../../lib/query-keys';
import { useAuthStore } from '../../store/auth.store';
import { FamilyMember } from '../../types/family';

interface EventRsvpPanelProps {
  familyId: string;
  eventId: string;
  attendees: EventAttendee[];
  members: FamilyMember[];
}

export function EventRsvpPanel({
  familyId,
  eventId,
  attendees,
  members,
}: EventRsvpPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const mine = attendees.find((a) => a.userId === userId);
  const [bringing, setBringing] = useState(mine?.bringing ?? '');

  const mutation = useMutation({
    mutationFn: (status: EventRsvpStatus) =>
      apiRequest(`/families/${familyId}/calendar/${eventId}/rsvp`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          bringing: bringing.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all(familyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(familyId) });
    },
  });

  const statuses: EventRsvpStatus[] = ['going', 'maybe', 'no'];

  return (
    <div className="space-y-3 pt-2 border-t border-gray-100">
      <p className="text-sm font-medium text-gray-800">{t('calendar.rsvpTitle')}</p>
      <div className="flex gap-2">
        {statuses.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => mutation.mutate(status)}
            disabled={mutation.isPending}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              mine?.status === status
                ? 'bg-brand-600 text-white border-brand-600'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t(`calendar.rsvp_${status}`)}
          </button>
        ))}
      </div>
      <label className="block text-sm text-gray-600">
        {t('calendar.bringing')}
        <input
          type="text"
          value={bringing}
          onChange={(e) => setBringing(e.target.value)}
          placeholder={t('calendar.bringingPlaceholder')}
          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </label>
      {attendees.length > 0 && (
        <ul className="space-y-1">
          {attendees.map((a) => {
            const member = members.find((m) => m.userId === a.userId);
            const name = member?.user.name ?? a.userId;
            return (
              <li key={a.userId} className="text-sm text-gray-600">
                {name}: {t(`calendar.rsvp_${a.status}`)}
                {a.bringing ? ` · ${t('calendar.bringing')}: ${a.bringing}` : ''}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
