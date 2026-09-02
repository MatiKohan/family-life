export function localDayRange(date = new Date()): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Noon UTC keeps the civil date stable across typical family timezones. */
export function allDayUtcIso(dateStr: string): { startAt: string; endAt: string } {
  return {
    startAt: `${dateStr}T12:00:00.000Z`,
    endAt: `${dateStr}T12:00:00.000Z`,
  };
}
