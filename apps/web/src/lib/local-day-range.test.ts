import { allDayUtcIso, toLocalDateString } from './local-day-range';

describe('local-day-range', () => {
  it('toLocalDateString uses the local calendar day, not the UTC date', () => {
    const instant = new Date('2026-04-15T22:30:00.000Z');
    expect(toLocalDateString(instant)).toBe(
      `${instant.getFullYear()}-${String(instant.getMonth() + 1).padStart(2, '0')}-${String(instant.getDate()).padStart(2, '0')}`,
    );
  });

  it('allDayUtcIso stores noon UTC on the chosen date', () => {
    expect(allDayUtcIso('2026-04-12')).toEqual({
      startAt: '2026-04-12T12:00:00.000Z',
      endAt: '2026-04-12T12:00:00.000Z',
    });
  });
});
