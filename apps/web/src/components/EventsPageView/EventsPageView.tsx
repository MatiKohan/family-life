import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../../lib/api-client';
import { useFamily } from '../../hooks/useFamily';
import { CalendarEvent } from '../../types/calendar';
import { Page } from '../../types/page';
import { CreateEventModal } from '../CalendarView/CalendarView';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isUpcoming(ev: CalendarEvent): boolean {
  const now = new Date();
  const evDate = new Date(ev.isAllDay ? ev.startAt.slice(0, 10) + 'T23:59:59' : ev.startAt);
  return evDate >= now || isSameDay(now, new Date(ev.startAt));
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatEventDate(ev: CalendarEvent): string {
  const start = new Date(ev.startAt);
  return start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatEventStart(ev: CalendarEvent): string {
  if (ev.isAllDay) return '';
  const start = new Date(ev.startAt);
  return start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// LinkEventModal — pick from existing family calendar events
// ---------------------------------------------------------------------------

interface LinkEventModalProps {
  familyId: string;
  pageId: string;
  alreadyLinkedIds: string[];
  onClose: () => void;
  onLinked: () => void;
}

function LinkEventModal({ familyId, pageId, alreadyLinkedIds, onClose, onLinked }: LinkEventModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Fetch a broad window of family events (next 6 months)
  const now = new Date();
  const sixMonthsLater = new Date(now.getFullYear(), now.getMonth() + 6, 1);

  const { data: allEvents = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar', familyId, now.toISOString().slice(0, 10), sixMonthsLater.toISOString().slice(0, 10)],
    queryFn: () =>
      apiRequest<CalendarEvent[]>(
        `/families/${familyId}/calendar?start=${encodeURIComponent(now.toISOString())}&end=${encodeURIComponent(sixMonthsLater.toISOString())}`,
      ),
    enabled: !!familyId,
  });

  const linkMutation = useMutation({
    mutationFn: (eventId: string) =>
      apiRequest(`/families/${familyId}/pages/${pageId}/event-refs`, {
        method: 'POST',
        body: JSON.stringify({ eventId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages', familyId, pageId] });
      onLinked();
      onClose();
    },
  });

  const available = allEvents.filter((ev) => !alreadyLinkedIds.includes(ev.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('calendar.pickEvent')}</h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          </div>
        ) : available.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">{t('calendar.noEvents')}</p>
        ) : (
          <ul className="space-y-1 max-h-64 overflow-y-auto">
            {available.map((ev) => (
              <li key={ev.id}>
                <button
                  onClick={() => linkMutation.mutate(ev.id)}
                  disabled={linkMutation.isPending}
                  className="w-full text-start px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <span className="font-medium">{ev.title}</span>
                  <span className="text-gray-400 ms-2">{formatEventDate(ev)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {t('calendar.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface EventsPageViewProps {
  page: Page & { events?: CalendarEvent[] };
  familyId: string;
}

export function EventsPageView({ page, familyId }: EventsPageViewProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showPast, setShowPast] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: family } = useFamily(familyId);
  const members = family?.members ?? [];

  const unlinkMutation = useMutation({
    mutationFn: (eventId: string) =>
      apiRequest(`/families/${familyId}/pages/${page.id}/event-refs/${eventId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages', familyId, page.id] });
    },
  });

  // Events come from page.events if the server includes them,
  // otherwise we fall back to fetching by eventIds from the family calendar.
  const linkedEvents: CalendarEvent[] = page.events ?? [];

  const visibleEvents = showPast
    ? [...linkedEvents].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    : linkedEvents
        .filter(isUpcoming)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  function handleEventCreated(event: CalendarEvent) {
    // After a new event is created via the calendar API, link it to the page
    apiRequest(`/families/${familyId}/pages/${page.id}/event-refs`, {
      method: 'POST',
      body: JSON.stringify({ eventId: event.id }),
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['pages', familyId, page.id] });
    }).catch(() => {
      // ignore — the event is created even if linking fails
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full">
      {/* Page heading */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl leading-none">{page.emoji}</span>
        <h1 className="text-3xl font-bold text-gray-900">{page.title}</h1>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setShowCreateModal(true)}
          className="text-sm px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors font-medium"
        >
          {t('calendar.newLinkedEvent')}
        </button>
        <button
          onClick={() => setShowLinkModal(true)}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {t('calendar.linkEvent')}
        </button>
        <button
          onClick={() => setShowPast((p) => !p)}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors ms-auto"
        >
          {showPast ? t('calendar.hidePast') : t('calendar.showPast')}
        </button>
      </div>

      {/* Event timeline */}
      {visibleEvents.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {t('calendar.noEventsLinked')}
        </div>
      ) : (
        <div className="space-y-0">
          {visibleEvents.map((ev) => {
            const timeLabel = formatEventStart(ev);
            return (
              <div key={ev.id} className="flex gap-4 group py-3 border-b border-gray-100 last:border-b-0">
                {/* Date column */}
                <div className="w-16 shrink-0 text-center">
                  <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded-lg block">
                    {formatEventDate(ev)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{ev.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {ev.isAllDay ? (
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">
                        {t('calendar.allDay')}
                      </span>
                    ) : (
                      timeLabel && `${t('calendar.starts')} ${timeLabel}`
                    )}
                  </p>
                  {ev.description && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{ev.description}</p>
                  )}
                  {ev.assignee && (
                    <p className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <span>👤</span>
                      {ev.assignee.avatarUrl ? (
                        <img src={ev.assignee.avatarUrl} alt={ev.assignee.name} className="w-4 h-4 rounded-full" />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-brand-100 text-brand-600 text-[10px] flex items-center justify-center font-semibold">
                          {ev.assignee.name[0].toUpperCase()}
                        </span>
                      )}
                      <span>{ev.assignee.name}</span>
                    </p>
                  )}
                </div>

                {/* Unlink button */}
                <button
                  type="button"
                  onClick={() => unlinkMutation.mutate(ev.id)}
                  disabled={unlinkMutation.isPending}
                  className="shrink-0 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30"
                  aria-label={t('calendar.unlinkEvent')}
                  title={t('calendar.unlinkEvent')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showLinkModal && (
        <LinkEventModal
          familyId={familyId}
          pageId={page.id}
          alreadyLinkedIds={page.eventIds}
          onClose={() => setShowLinkModal(false)}
          onLinked={() => queryClient.invalidateQueries({ queryKey: ['pages', familyId, page.id] })}
        />
      )}
      {showCreateModal && (
        <CreateEventModal
          familyId={familyId}
          initialDate={new Date()}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleEventCreated}
          members={members}
        />
      )}
    </div>
  );
}
