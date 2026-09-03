import { formatShortDate, intlLocale } from './date-locale';

describe('date-locale', () => {
  it('maps Hebrew app language to he-IL', () => {
    expect(intlLocale('he')).toBe('he-IL');
    expect(intlLocale('he-IL')).toBe('he-IL');
    expect(intlLocale('en')).toBe('en-US');
  });

  it('formats short dates in English and Hebrew', () => {
    const d = new Date(2026, 8, 1);
    expect(formatShortDate(d, 'en')).toMatch(/Sep/);
    expect(formatShortDate(d, 'he')).toMatch(/ספט/);
  });
});
