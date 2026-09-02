export function calendarSubscribeLinks(
  familyId: string,
  token: string,
  options?: { origin?: string; apiBase?: string },
): { icsUrl: string; webcalUrl: string; googleUrl: string } {
  const origin =
    options?.origin ??
    (typeof window !== 'undefined' ? window.location.origin : '');
  const envBase =
    options?.apiBase ??
    (typeof import.meta !== 'undefined'
      ? (import.meta.env.VITE_API_URL as string | undefined)
      : undefined);
  const apiBase = envBase?.replace(/\/$/, '') || origin;
  const icsUrl = `${apiBase}/api/families/${familyId}/calendar.ics?token=${encodeURIComponent(token)}`;
  const webcalUrl = icsUrl.replace(/^https?:\/\//, 'webcal://');
  return {
    icsUrl,
    webcalUrl,
    googleUrl: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`,
  };
}
