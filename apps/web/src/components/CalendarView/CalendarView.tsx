import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../../lib/api-client';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import { CalendarEvent, CreateEventRequest } from '../../types/calendar';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toLocalDateTimeString(date: Date): string {
  const base = toLocalDateString(date);
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${base}T${h}:${min}`;
}

function buildMonthRange(month: Date): { start: string; end: string } {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
}

function buildGridDays(month: Date): Array<{ date: Date; isCurrentMonth: boolean }> {
  const year = month.getFullYear();
  const monthIdx = month.getMonth();

  const firstOfMonth = new Date(year, monthIdx, 1);
  const lastOfMonth = new Date(year, monthIdx + 1, 0);

  const startDay = firstOfMonth.getDay(); // 0 = Sun
  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  // Pad from previous month
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, monthIdx, -i);
    days.push({ date: d, isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= lastOfMonth.getDate(); d++) {
    days.push({ date: new Date(year, monthIdx, d), isCurrentMonth: true });
  }

  // Pad to complete last row (always show 6 rows = 42 cells for stability)
  while (days.length < 42) {
    const next = days.length - startDay - lastOfMonth.getDate() + 1;
    days.push({ date: new Date(year, monthIdx + 1, next), isCurrentMonth: false });
  }

  return days;
}

function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const dayStr = toLocalDateString(day);
  return events.filter((ev) => {
    const evDay = ev.startAt.slice(0, 10);
    return evDay === dayStr;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatEventTime(ev: CalendarEvent): string {
  if (ev.isAllDay) return '';
  const d = new Date(ev.startAt);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// CreateEventModal
// ---------------------------------------------------------------------------

interface CreateEventModalProps {
  familyId: string;
  initialDate: Date;
  onClose: () => void;
  onCreated?: (event: CalendarEvent) => void;
}

function CreateEventModal({ familyId, initialDate, onClose, onCreated }: CreateEventModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const defaultStart = toLocalDateTimeString(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), initialDate.getDate(), 9, 0),
  );
  const defaultEnd = toLocalDateTimeString(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), initialDate.getDate(), 10, 0),
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState(defaultStart);
  const [endAt, setEndAt] = useState(defaultEnd);
  const [isAllDay, setIsAllDay] = useState(false);

  const createMutation = useMutation({
    mutationFn: (req: CreateEventRequest) =>
      apiRequest<CalendarEvent>(`/families/${familyId}/calendar`, {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ['calendar', familyId] });
      onCreated?.(event);
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const req: CreateEventRequest = {
      title: trimmed,
      description: description.trim() || undefined,
      startAt: isAllDay
        ? new Date(startAt.slice(0, 10) + 'T00:00:00').toISOString()
        : new Date(startAt).toISOString(),
      endAt: isAllDay
        ? new Date(startAt.slice(0, 10) + 'T23:59:59').toISOString()
        : new Date(endAt).toISOString(),
      isAllDay,
    };

    createMutation.mutate(req);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('calendar.createEvent')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="createEventTitle" className="block text-sm font-medium text-gray-700 mb-1">
              {t('calendar.eventTitle')}
            </label>
            <input
              id="createEventTitle"
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('calendar.eventTitle')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="createEventDesc" className="block text-sm font-medium text-gray-700 mb-1">
              {t('calendar.description')}
            </label>
            <textarea
              id="createEventDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none"
            />
          </div>

          {/* All day toggle */}
          <div className="flex items-center gap-2">
            <input
              id="isAllDay"
              type="checkbox"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-400"
            />
            <label htmlFor="isAllDay" className="text-sm text-gray-700">{t('calendar.allDay')}</label>
          </div>

          {/* Date fields */}
          {isAllDay ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('calendar.startDate')}
              </label>
              <input
                type="date"
                value={startAt.slice(0, 10)}
                onChange={(e) => setStartAt(e.target.value + 'T00:00')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                required
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('calendar.startDate')}
                </label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('calendar.endDate')}
                </label>
                <input
                  type="datetime-local"
                  value={endAt}
                  min={startAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  required
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              {t('calendar.cancel')}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !title.trim()}
              className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? t('common.loading') : t('calendar.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EventDetailModal
// ---------------------------------------------------------------------------

interface EventDetailModalProps {
  event: CalendarEvent;
  familyId: string;
  onClose: () => void;
}

function EventDetailModal({ event, familyId, onClose }: EventDetailModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? '');
  const [startAt, setStartAt] = useState(toLocalDateTimeString(new Date(event.startAt)));
  const [endAt, setEndAt] = useState(toLocalDateTimeString(new Date(event.endAt)));
  const [isAllDay, setIsAllDay] = useState(event.isAllDay);

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<CreateEventRequest>) =>
      apiRequest<CalendarEvent>(`/families/${familyId}/calendar/${event.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', familyId] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/families/${familyId}/calendar/${event.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', familyId] });
      onClose();
    },
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      startAt: isAllDay
        ? new Date(startAt.slice(0, 10) + 'T00:00:00').toISOString()
        : new Date(startAt).toISOString(),
      endAt: isAllDay
        ? new Date(startAt.slice(0, 10) + 'T23:59:59').toISOString()
        : new Date(endAt).toISOString(),
      isAllDay,
    });
  }

  function handleDelete() {
    if (!window.confirm(t('calendar.confirmDelete'))) return;
    deleteMutation.mutate();
  }

  const startFormatted = event.isAllDay
    ? new Date(event.startAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : new Date(event.startAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  const endFormatted = event.isAllDay
    ? null
    : new Date(event.endAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {!editing ? (
          <>
            <div className="flex items-start justify-between gap-2 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{event.title}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
                aria-label={t('common.close')}
              >
                ×
              </button>
            </div>

            <div className="space-y-2 mb-6">
              <p className="text-sm text-gray-600">
                <span className="font-medium">{t('calendar.startDate')}:</span> {startFormatted}
                {event.isAllDay && (
                  <span className="ms-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                    {t('calendar.allDay')}
                  </span>
                )}
              </p>
              {endFormatted && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{t('calendar.endDate')}:</span> {endFormatted}
                </p>
              )}
              {event.description && (
                <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{event.description}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="text-sm text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
              >
                {t('calendar.deleteEvent')}
              </button>
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              >
                {t('calendar.editEvent')}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('calendar.editEvent')}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('calendar.eventTitle')}
                </label>
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('calendar.description')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="editIsAllDay"
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-400"
                />
                <label htmlFor="editIsAllDay" className="text-sm text-gray-700">{t('calendar.allDay')}</label>
              </div>
              {!isAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('calendar.startDate')}</label>
                    <input
                      type="datetime-local"
                      value={startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('calendar.endDate')}</label>
                    <input
                      type="datetime-local"
                      value={endAt}
                      min={startAt}
                      onChange={(e) => setEndAt(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                </div>
              )}
              {isAllDay && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('calendar.startDate')}</label>
                  <input
                    type="date"
                    value={startAt.slice(0, 10)}
                    onChange={(e) => setStartAt(e.target.value + 'T00:00')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  {t('calendar.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {updateMutation.isPending ? t('common.loading') : t('calendar.save')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CalendarView (main export)
// ---------------------------------------------------------------------------

interface CalendarViewProps {
  familyId: string;
  onEventClick?: (event: CalendarEvent) => void;
}

export function CalendarView({ familyId, onEventClick }: CalendarViewProps) {
  const { t, i18n } = useTranslation();
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [createModalDate, setCreateModalDate] = useState<Date | null>(null);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);

  const { start, end } = buildMonthRange(currentMonth);
  const { data: events = [], isLoading } = useCalendarEvents(familyId, start, end);

  const gridDays = buildGridDays(currentMonth);

  const monthNames = t('calendar.monthNames', { returnObjects: true }) as string[];
  const dayNames = t('calendar.dayNames', { returnObjects: true }) as string[];

  const monthLabel = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  function prevMonth() {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  function goToday() {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  function handleDayClick(day: Date) {
    const dayEvents = eventsForDay(events, day);
    if (dayEvents.length === 0) {
      setCreateModalDate(day);
    }
  }

  function handleEventPillClick(e: React.MouseEvent, event: CalendarEvent) {
    e.stopPropagation();
    if (onEventClick) {
      onEventClick(event);
    } else {
      setDetailEvent(event);
    }
  }

  const isRtl = i18n.dir() === 'rtl';

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white">
        <button
          onClick={isRtl ? nextMonth : prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Previous month"
        >
          {isRtl ? '→' : '←'}
        </button>
        <button
          onClick={isRtl ? prevMonth : nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Next month"
        >
          {isRtl ? '←' : '→'}
        </button>
        <h2 className="text-base font-semibold text-gray-900 min-w-[160px] text-center">{monthLabel}</h2>
        <button
          onClick={goToday}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {t('calendar.today')}
        </button>
        <button
          onClick={() => setCreateModalDate(today)}
          className="ms-auto text-sm px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors font-medium"
        >
          {t('calendar.newEvent')}
        </button>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        {/* Day name headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {dayNames.map((name) => (
            <div key={name} className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
              {name}
            </div>
          ))}
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div
              className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"
              role="status"
              aria-label={t('common.loading')}
            />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {gridDays.map(({ date, isCurrentMonth }, idx) => {
              const dayEvents = eventsForDay(events, date);
              const isToday = isSameDay(date, today);
              const hasOverflow = dayEvents.length > 2;
              const visibleEvents = dayEvents.slice(0, 2);
              const overflowCount = dayEvents.length - 2;

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(date)}
                  className={`min-h-[80px] p-1 border-b border-e border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                    !isCurrentMonth ? 'bg-gray-50/50' : ''
                  }`}
                >
                  {/* Date number */}
                  <div className="flex justify-center mb-1">
                    <span
                      className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-brand-600 text-white'
                          : isCurrentMonth
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Event pills */}
                  <div className="space-y-0.5">
                    {visibleEvents.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={(e) => handleEventPillClick(e, ev)}
                        className="w-full text-start bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded truncate block hover:bg-blue-200 transition-colors"
                        title={ev.title}
                      >
                        {ev.isAllDay ? '' : formatEventTime(ev) + ' '}
                        {ev.title}
                      </button>
                    ))}
                    {hasOverflow && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCreateModalDate(null);
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 px-1"
                      >
                        +{overflowCount} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && events.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-4">{t('calendar.noEvents')}</p>
        )}
      </div>

      {/* Modals */}
      {createModalDate && (
        <CreateEventModal
          familyId={familyId}
          initialDate={createModalDate}
          onClose={() => setCreateModalDate(null)}
        />
      )}
      {detailEvent && (
        <EventDetailModal
          event={detailEvent}
          familyId={familyId}
          onClose={() => setDetailEvent(null)}
        />
      )}
    </div>
  );
}

// Re-export CreateEventModal for use in EventsPageView
export { CreateEventModal };
