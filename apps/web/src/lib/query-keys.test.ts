import { QueryClient } from '@tanstack/react-query';
import { invalidateForRealtimeEvent, queryKeys } from './query-keys';

describe('queryKeys', () => {
  it('matches useCalendarEvents / usePage / usePages key shapes', () => {
    expect(queryKeys.calendar.range('family-1', '2026-04-01', '2026-04-30')).toEqual([
      'calendar',
      'family-1',
      '2026-04-01',
      '2026-04-30',
    ]);
    expect(queryKeys.pages.all('family-1')).toEqual(['pages', 'family-1']);
    expect(queryKeys.pages.detail('family-1', 'page-1')).toEqual(['pages', 'family-1', 'page-1']);
  });
});

describe('invalidateForRealtimeEvent', () => {
  const familyId = 'family-1';

  function seedClient() {
    const qc = new QueryClient();
    const pageList = queryKeys.pages.all(familyId);
    const pageDetail = queryKeys.pages.detail(familyId, 'page-1');
    const calendarRange = queryKeys.calendar.range(familyId, '2026-04-01', '2026-04-30');
    const activity = queryKeys.activity.all(familyId);
    qc.setQueryData(pageList, []);
    qc.setQueryData(pageDetail, { id: 'page-1' });
    qc.setQueryData(calendarRange, []);
    qc.setQueryData(activity, { items: [] });
    return { qc, pageList, pageDetail, calendarRange, activity };
  }

  it('invalidates calendar range queries used by useCalendarEvents', async () => {
    const { qc, calendarRange, pageDetail } = seedClient();
    await invalidateForRealtimeEvent(qc, familyId, 'calendar');
    expect(qc.getQueryState(calendarRange)?.isInvalidated).toBe(true);
    expect(qc.getQueryState(pageDetail)?.isInvalidated).toBe(false);
  });

  it('invalidates page list and detail keys used by usePages / usePage', async () => {
    const { qc, pageList, pageDetail, calendarRange } = seedClient();
    await invalidateForRealtimeEvent(qc, familyId, 'pages');
    expect(qc.getQueryState(pageList)?.isInvalidated).toBe(true);
    expect(qc.getQueryState(pageDetail)?.isInvalidated).toBe(true);
    expect(qc.getQueryState(calendarRange)?.isInvalidated).toBe(false);
  });

  it('invalidates activity feed keys', async () => {
    const { qc, activity } = seedClient();
    await invalidateForRealtimeEvent(qc, familyId, 'activity');
    expect(qc.getQueryState(activity)?.isInvalidated).toBe(true);
  });
});
