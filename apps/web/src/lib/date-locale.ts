/** Maps the app language to an Intl locale so dates match the UI, not the OS. */
export function intlLocale(language: string): string {
  return language.toLowerCase().startsWith('he') ? 'he-IL' : 'en-US';
}

export function formatShortDate(value: Date | string, language: string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString(intlLocale(language), { month: 'short', day: 'numeric' });
}

export function formatLongDate(value: Date | string, language: string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString(intlLocale(language), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(value: Date | string, language: string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleTimeString(intlLocale(language), { hour: 'numeric', minute: '2-digit' });
}

export function formatDateTime(value: Date | string, language: string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString(intlLocale(language), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
