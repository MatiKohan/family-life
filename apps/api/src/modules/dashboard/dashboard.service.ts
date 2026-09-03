import { ForbiddenException, Injectable } from '@nestjs/common';
import type {
  DashboardCalendarEvent,
  FamilyDashboard,
} from '@family-life/types';
import { PrismaService } from '../../database/prisma.service';
import { CalendarService } from '../calendar/calendar.service';

type ListLike = {
  text?: string;
  checked?: boolean;
  assigneeId?: string | null;
  deletedAt?: string | null;
};

function collectListItems(raw: unknown): Array<ListLike & { text: string }> {
  if (!Array.isArray(raw)) return [];
  const out: Array<ListLike & { text: string }> = [];
  const first = raw[0] as Record<string, unknown> | undefined;
  if (first && (first['type'] === 'list' || first['type'] === 'text')) {
    for (const block of raw as Array<{ type: string; items?: ListLike[] }>) {
      if (block.type !== 'list' || !Array.isArray(block.items)) continue;
      for (const item of block.items) {
        if (item.text && !item.deletedAt)
          out.push({ ...item, text: item.text });
      }
    }
    return out;
  }
  for (const item of raw as ListLike[]) {
    if (item.text && !item.deletedAt) out.push({ ...item, text: item.text });
  }
  return out;
}

function collectTasks(raw: unknown): Array<{
  text: string;
  status: string;
  assigneeId: string | null;
}> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{
    text: string;
    status: string;
    assigneeId: string | null;
  }> = [];
  for (const item of raw as Array<{
    text?: string;
    status?: string;
    assigneeId?: string | null;
    deletedAt?: string | null;
  }>) {
    if (!item.text || item.deletedAt) continue;
    out.push({
      text: item.text,
      status: item.status ?? 'todo',
      assigneeId: item.assigneeId ?? null,
    });
  }
  return out;
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return '';
}

function toDashboardEvent(ev: Record<string, unknown>): DashboardCalendarEvent {
  return {
    id: asText(ev['id']),
    title: asText(ev['title']),
    startAt: asIso(ev['startAt']),
    endAt: asIso(ev['endAt']),
    isAllDay: Boolean(ev['isAllDay']),
    assigneeId: typeof ev['assigneeId'] === 'string' ? ev['assigneeId'] : null,
    attendees: Array.isArray(ev['attendees'])
      ? (ev['attendees'] as DashboardCalendarEvent['attendees'])
      : undefined,
    recurrenceBaseId: ev['recurrenceBaseId']
      ? asText(ev['recurrenceBaseId'])
      : undefined,
  };
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendarService: CalendarService,
  ) {}

  async getDashboard(
    userId: string,
    familyId: string,
    start: string,
    end: string,
  ): Promise<FamilyDashboard> {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a family member');

    const upcomingEnd = new Date(end);
    upcomingEnd.setUTCDate(upcomingEnd.getUTCDate() + 14);

    const [upcomingEvents, pages] = await Promise.all([
      this.calendarService.listEvents(
        familyId,
        userId,
        start,
        upcomingEnd.toISOString(),
      ),
      this.prisma.page.findMany({
        where: {
          familyId,
          deletedAt: null,
          type: { in: ['list', 'tasks'] },
        },
        select: {
          id: true,
          title: true,
          emoji: true,
          type: true,
          items: true,
          taskItems: true,
        },
      }),
    ]);

    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    const mapped = upcomingEvents.map(toDashboardEvent);
    const todayEvents = mapped.filter((ev) => {
      const t = new Date(ev.startAt).getTime();
      return t >= startMs && t < endMs;
    });

    const listItems: FamilyDashboard['assigned']['listItems'] = [];
    const tasks: FamilyDashboard['assigned']['tasks'] = [];
    let openListItems = 0;
    let leftoverPageId: string | null = null;
    let leftoverPageOpen = 0;

    for (const page of pages) {
      if (page.type === 'list') {
        let pageOpen = 0;
        for (const item of collectListItems(page.items)) {
          if (!item.checked) {
            openListItems += 1;
            pageOpen += 1;
          }
          if (item.assigneeId === userId && !item.checked) {
            listItems.push({
              text: item.text,
              pageId: page.id,
              pageTitle: page.title,
              pageEmoji: page.emoji,
            });
          }
        }
        if (pageOpen > leftoverPageOpen) {
          leftoverPageOpen = pageOpen;
          leftoverPageId = page.id;
        }
      }
      if (page.type === 'tasks') {
        for (const task of collectTasks(page.taskItems)) {
          if (task.assigneeId === userId && task.status !== 'done') {
            tasks.push({
              text: task.text,
              status: task.status,
              pageId: page.id,
              pageTitle: page.title,
              pageEmoji: page.emoji,
            });
          }
        }
      }
    }

    const assignedEvents = mapped.filter((ev) => ev.assigneeId === userId);

    return {
      todayEvents,
      assigned: {
        listItems,
        tasks,
        events: assignedEvents,
      },
      openListItems,
      leftoverPageId,
    };
  }
}
