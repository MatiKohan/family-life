import { calendarSubscribeLinks } from './calendar-subscribe';

describe('calendarSubscribeLinks', () => {
  it('builds Google, Apple, and HTTPS ICS URLs with an encoded token', () => {
    const links = calendarSubscribeLinks('fam-1', 'tok?x', {
      origin: 'https://app.example',
      apiBase: '',
    });

    expect(links.icsUrl).toBe(
      'https://app.example/api/families/fam-1/calendar.ics?token=tok%3Fx',
    );
    expect(links.webcalUrl).toBe(
      'webcal://app.example/api/families/fam-1/calendar.ics?token=tok%3Fx',
    );
    expect(links.googleUrl).toContain('calendar.google.com');
    expect(links.googleUrl).toContain(encodeURIComponent(links.webcalUrl));
  });

  it('prefers an explicit API base over the page origin', () => {
    const links = calendarSubscribeLinks('fam-1', 'abc', {
      origin: 'https://app.example',
      apiBase: 'https://api.example',
    });
    expect(links.icsUrl.startsWith('https://api.example/api/')).toBe(true);
  });
});
