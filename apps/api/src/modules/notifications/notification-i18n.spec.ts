import {
  activityBody,
  normalizeLocale,
  tNotification,
} from './notification-i18n';

describe('notification-i18n', () => {
  it('treats he* as Hebrew and anything else as English', () => {
    expect(normalizeLocale('he')).toBe('he');
    expect(normalizeLocale('he-IL')).toBe('he');
    expect(normalizeLocale('en')).toBe('en');
    expect(normalizeLocale(undefined)).toBe('en');
  });

  it('interpolates Hebrew assignment copy', () => {
    expect(tNotification('he', 'assigned_push', { itemText: 'חלב' })).toBe(
      'הוקצתה לך משימה: חלב',
    );
  });

  it('builds activity sentences in both locales', () => {
    expect(
      activityBody('en', 'Ada', {
        type: 'event',
        eventTitle: 'Dinner',
      }),
    ).toBe('Ada added an event: Dinner');
    expect(
      activityBody('he', 'Ada', {
        type: 'event',
        eventTitle: 'Dinner',
      }),
    ).toBe('Ada הוסיף אירוע: Dinner');
  });
});
