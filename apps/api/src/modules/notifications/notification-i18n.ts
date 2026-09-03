export type AppLocale = 'en' | 'he';

export type FamilyActivityKind =
  | { type: 'page_created'; pageTitle: string }
  | { type: 'list_item'; itemText: string; pageTitle: string }
  | { type: 'task'; itemText: string; pageTitle: string }
  | { type: 'event'; eventTitle: string };

type MessageKey =
  | 'invite'
  | 'reminder_wa'
  | 'reminder_push'
  | 'assigned_wa'
  | 'assigned_push'
  | 'someone'
  | 'activity_page'
  | 'activity_item'
  | 'activity_task'
  | 'activity_event';

const MESSAGES: Record<AppLocale, Record<MessageKey, string>> = {
  en: {
    invite:
      '{emoji} You have been invited to join *{familyName}* on Family Life!\n\nTap here to join: {inviteUrl}',
    reminder_wa: '{emoji} Reminder: *{eventTitle}* is coming up on {timeLabel}',
    reminder_push: 'Reminder: {eventTitle} on {timeLabel}',
    assigned_wa:
      '{emoji} You have been assigned a task in *{familyName}*:\n\n"{itemText}"',
    assigned_push: 'You were assigned: {itemText}',
    someone: 'Someone',
    activity_page: '{actorName} created a new page: {pageTitle}',
    activity_item: '{actorName} added "{itemText}" to {pageTitle}',
    activity_task: '{actorName} added a task "{itemText}" to {pageTitle}',
    activity_event: '{actorName} added an event: {eventTitle}',
  },
  he: {
    invite:
      '{emoji} הוזמנת להצטרף ל*{familyName}* ב-Family Life!\n\nלהצטרפות: {inviteUrl}',
    reminder_wa: '{emoji} תזכורת: *{eventTitle}* ב-{timeLabel}',
    reminder_push: 'תזכורת: {eventTitle} ב-{timeLabel}',
    assigned_wa: '{emoji} הוקצתה לך משימה ב-*{familyName}*:\n\n"{itemText}"',
    assigned_push: 'הוקצתה לך משימה: {itemText}',
    someone: 'מישהו',
    activity_page: '{actorName} יצר דף חדש: {pageTitle}',
    activity_item: '{actorName} הוסיף "{itemText}" ל{pageTitle}',
    activity_task: '{actorName} הוסיף משימה "{itemText}" ל{pageTitle}',
    activity_event: '{actorName} הוסיף אירוע: {eventTitle}',
  },
};

export function normalizeLocale(raw?: string | null): AppLocale {
  if (raw && raw.toLowerCase().startsWith('he')) return 'he';
  return 'en';
}

export function tNotification(
  locale: AppLocale,
  key: MessageKey,
  vars: Record<string, string> = {},
): string {
  let out = MESSAGES[locale][key];
  for (const [name, value] of Object.entries(vars)) {
    out = out.split(`{${name}}`).join(value);
  }
  return out;
}

export function formatEventWhen(date: Date, locale: AppLocale): string {
  return date.toLocaleString(locale === 'he' ? 'he-IL' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function activityBody(
  locale: AppLocale,
  actorName: string,
  activity: FamilyActivityKind,
): string {
  const actor = actorName.trim() || tNotification(locale, 'someone');
  switch (activity.type) {
    case 'page_created':
      return tNotification(locale, 'activity_page', {
        actorName: actor,
        pageTitle: activity.pageTitle,
      });
    case 'list_item':
      return tNotification(locale, 'activity_item', {
        actorName: actor,
        itemText: activity.itemText,
        pageTitle: activity.pageTitle,
      });
    case 'task':
      return tNotification(locale, 'activity_task', {
        actorName: actor,
        itemText: activity.itemText,
        pageTitle: activity.pageTitle,
      });
    case 'event':
      return tNotification(locale, 'activity_event', {
        actorName: actor,
        eventTitle: activity.eventTitle,
      });
  }
}
