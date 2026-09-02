import { expandEvent, parseRecurrence } from './calendar-recurrence';

describe('calendar-recurrence', () => {
  describe('parseRecurrence', () => {
    it('returns null for missing or invalid freq', () => {
      expect(parseRecurrence(null)).toBeNull();
      expect(parseRecurrence({ freq: 'hourly' })).toBeNull();
    });

    it('keeps until and exceptions', () => {
      expect(
        parseRecurrence({
          freq: 'weekly',
          until: '2026-06-01',
          exceptions: ['2026-05-08'],
        }),
      ).toEqual({
        freq: 'weekly',
        until: '2026-06-01',
        exceptions: ['2026-05-08'],
      });
    });
  });

  describe('expandEvent', () => {
    const base = {
      id: 'event-1',
      title: 'Standup',
      startAt: new Date('2026-05-01T10:00:00.000Z'),
      endAt: new Date('2026-05-01T11:00:00.000Z'),
      recurrence: { freq: 'weekly' as const },
    };

    it('returns the original event when there is no recurrence', () => {
      const event = { ...base, recurrence: null };
      expect(
        expandEvent(event, new Date('2026-05-01'), new Date('2026-05-31')),
      ).toEqual([event]);
    });

    it('expands weekly instances in the range using UTC dates', () => {
      const result = expandEvent(
        base,
        new Date('2026-05-01T00:00:00.000Z'),
        new Date('2026-05-31T23:59:59.000Z'),
      );
      const starts = result.map((ev) => ev.startAt as string);
      expect(starts.some((d) => d.startsWith('2026-05-01'))).toBe(true);
      expect(starts.some((d) => d.startsWith('2026-05-08'))).toBe(true);
      expect(result[1]).toMatchObject({
        recurrenceBaseId: 'event-1',
        instanceDate: '2026-05-08',
      });
    });

    it('skips exception dates', () => {
      const result = expandEvent(
        { ...base, recurrence: { freq: 'weekly', exceptions: ['2026-05-08'] } },
        new Date('2026-05-01T00:00:00.000Z'),
        new Date('2026-05-31T23:59:59.000Z'),
      );
      const starts = result.map((ev) => ev.startAt as string);
      expect(starts.some((d) => d.startsWith('2026-05-08'))).toBe(false);
    });
  });
});
