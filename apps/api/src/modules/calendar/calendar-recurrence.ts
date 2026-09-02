export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type RecurrenceRule = {
  freq: RecurrenceFreq;
  until?: string;
  exceptions?: string[];
};

const FREQS: RecurrenceFreq[] = ['daily', 'weekly', 'monthly', 'yearly'];

export function parseRecurrence(raw: unknown): RecurrenceRule | null {
  if (!raw || typeof raw !== 'object') return null;
  const freq = (raw as RecurrenceRule).freq;
  if (!FREQS.includes(freq)) return null;
  const until = (raw as RecurrenceRule).until;
  const exceptions = (raw as RecurrenceRule).exceptions;
  return {
    freq,
    ...(typeof until === 'string' && until ? { until } : {}),
    ...(Array.isArray(exceptions)
      ? {
          exceptions: exceptions.filter(
            (d): d is string => typeof d === 'string',
          ),
        }
      : {}),
  };
}

function asDate(value: unknown): Date {
  return value instanceof Date
    ? new Date(value.getTime())
    : new Date(value as string);
}

export function advanceDate(date: Date, freq: RecurrenceFreq): Date {
  const d = new Date(date.getTime());
  switch (freq) {
    case 'daily':
      d.setUTCDate(d.getUTCDate() + 1);
      break;
    case 'weekly':
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case 'monthly':
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
    case 'yearly':
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
  }
  return d;
}

export function instanceDateUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Expand a stored event into occurrences whose start falls in [rangeStart, rangeEnd].
 * Recurrence is advanced in UTC so instance dates match stored instants, not the API host TZ.
 */
export function expandEvent(
  event: Record<string, unknown>,
  rangeStart: Date,
  rangeEnd: Date,
): Record<string, unknown>[] {
  const recurrence = parseRecurrence(event['recurrence']);
  if (!recurrence) return [event];

  const startAt = asDate(event['startAt']);
  const endAt = asDate(event['endAt']);
  const duration = endAt.getTime() - startAt.getTime();
  const exceptions = new Set(recurrence.exceptions ?? []);
  const until = recurrence.until
    ? new Date(recurrence.until + 'T23:59:59.000Z')
    : null;

  const instances: Record<string, unknown>[] = [];
  let cursor = new Date(startAt.getTime());
  let count = 0;

  while (cursor <= rangeEnd && count < 500) {
    count++;
    if (until && cursor > until) break;

    const dateStr = instanceDateUtc(cursor);
    const isBase = cursor.getTime() === startAt.getTime();

    if (cursor >= rangeStart && !exceptions.has(dateStr)) {
      instances.push({
        ...event,
        id: isBase ? event['id'] : `${event['id'] as string}_${dateStr}`,
        startAt: cursor.toISOString(),
        endAt: new Date(cursor.getTime() + duration).toISOString(),
        recurrenceBaseId: event['id'],
        instanceDate: dateStr,
      });
    }

    cursor = advanceDate(cursor, recurrence.freq);
  }

  return instances;
}
