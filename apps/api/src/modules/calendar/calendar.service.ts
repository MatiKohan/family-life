import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { expandEvent, parseRecurrence } from './calendar-recurrence';
import { CreateEventDto } from './dto/create-event.dto';
import { RsvpEventDto } from './dto/rsvp-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

type StoredAttendee = {
  userId: string;
  status: 'going' | 'maybe' | 'no';
  bringing?: string;
};

function parseAttendees(raw: unknown): StoredAttendee[] {
  if (!Array.isArray(raw)) return [];
  const out: StoredAttendee[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const userId = (row as StoredAttendee).userId;
    const status = (row as StoredAttendee).status;
    if (typeof userId !== 'string') continue;
    if (status !== 'going' && status !== 'maybe' && status !== 'no') continue;
    const bringing = (row as StoredAttendee).bringing;
    out.push({
      userId,
      status,
      ...(typeof bringing === 'string' && bringing.trim()
        ? { bringing: bringing.trim() }
        : {}),
    });
  }
  return out;
}

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly realtimeService: RealtimeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async requireMember(userId: string, familyId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a family member');
    return member;
  }

  private async notifyAssignment(
    familyId: string,
    actorUserId: string,
    assigneeId: string | null | undefined,
    previousAssigneeId: string | null | undefined,
    title: string,
  ): Promise<void> {
    if (!assigneeId || assigneeId === actorUserId) return;
    if (assigneeId === previousAssigneeId) return;
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      select: { name: true, emoji: true },
    });
    if (!family) return;
    void this.notificationsService.sendAssignmentNotification(
      familyId,
      assigneeId,
      title,
      family.name,
      family.emoji,
    );
  }

  async listEvents(
    familyId: string,
    userId: string,
    start?: string,
    end?: string,
  ) {
    await this.requireMember(userId, familyId);

    const rangeStart = start ? new Date(start) : new Date(0);
    const rangeEnd = end ? new Date(end) : new Date('2099-12-31');

    // Fetch all events that could have instances in range:
    // - non-recurring: startAt within range
    // - recurring: startAt <= rangeEnd (instance could fall in range)
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        familyId,
        startAt: { lte: rangeEnd },
      },
      include: {
        assignee: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { startAt: 'asc' },
    });

    const expanded = events.flatMap((ev) =>
      expandEvent(
        ev as unknown as Record<string, unknown>,
        rangeStart,
        rangeEnd,
      ),
    );

    return expanded
      .filter((ev) => new Date(ev['startAt'] as string) <= rangeEnd)
      .sort(
        (a, b) =>
          new Date(a['startAt'] as string).getTime() -
          new Date(b['startAt'] as string).getTime(),
      );
  }

  async createEvent(familyId: string, userId: string, dto: CreateEventDto) {
    await this.requireMember(userId, familyId);

    const event = await this.prisma.calendarEvent.create({
      data: {
        familyId,
        title: dto.title,
        description: dto.description,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        isAllDay: dto.isAllDay ?? false,
        reminderMinutesBefore: dto.reminderMinutesBefore,
        createdBy: userId,
        ...(dto.recurrence
          ? { recurrence: dto.recurrence as unknown as Prisma.InputJsonValue }
          : {}),
        ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
      },
    });

    await this.activityService.log({
      familyId,
      userId,
      type: 'event_created',
      payload: { eventId: event.id, title: event.title },
    });

    this.realtimeService.emit(familyId, 'calendar');
    this.realtimeService.emit(familyId, 'activity');
    await this.notifyAssignment(
      familyId,
      userId,
      event.assigneeId,
      undefined,
      event.title,
    );
    void this.notificationsService.sendFamilyActivityNotification({
      familyId,
      actorUserId: userId,
      excludeUserIds: [event.assigneeId],
      activity: { type: 'event', eventTitle: event.title },
      url: `/family/${familyId}/calendar`,
    });
    return event;
  }

  async updateEvent(
    familyId: string,
    eventId: string,
    userId: string,
    dto: UpdateEventDto,
  ) {
    await this.requireMember(userId, familyId);

    const { instanceDate, editMode, recurrence, ...fields } = dto;

    // If editing a specific instance of a recurring event
    if (instanceDate && editMode === 'this') {
      // Add this date to exceptions on the base event
      const baseEvent = await this.prisma.calendarEvent.findFirst({
        where: { id: eventId, familyId },
      });
      if (!baseEvent) throw new NotFoundException('Event not found');

      const rule = parseRecurrence(baseEvent.recurrence);
      if (!rule) throw new NotFoundException('Event not found');
      const exceptions = [...(rule.exceptions ?? []), instanceDate];
      await this.prisma.calendarEvent.update({
        where: { id: eventId },
        data: {
          recurrence: {
            ...rule,
            exceptions,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      // Create a standalone override event for this instance
      const duration =
        new Date(baseEvent.endAt).getTime() -
        new Date(baseEvent.startAt).getTime();
      const instanceStart = fields.startAt
        ? new Date(fields.startAt)
        : new Date(instanceDate + baseEvent.startAt.toISOString().slice(10));
      const instanceEnd = fields.endAt
        ? new Date(fields.endAt)
        : new Date(instanceStart.getTime() + duration);

      const created = await this.prisma.calendarEvent.create({
        data: {
          familyId,
          title: fields.title ?? baseEvent.title,
          description: fields.description ?? baseEvent.description,
          startAt: instanceStart,
          endAt: instanceEnd,
          isAllDay: fields.isAllDay ?? baseEvent.isAllDay,
          reminderMinutesBefore:
            fields.reminderMinutesBefore !== undefined
              ? fields.reminderMinutesBefore
              : baseEvent.reminderMinutesBefore,
          assigneeId:
            fields.assigneeId !== undefined
              ? fields.assigneeId
              : baseEvent.assigneeId,
          attendees: baseEvent.attendees as Prisma.InputJsonValue,
          createdBy: userId,
        },
      });
      this.realtimeService.emit(familyId, 'calendar');
      await this.notifyAssignment(
        familyId,
        userId,
        created.assigneeId,
        baseEvent.assigneeId,
        created.title,
      );
      return created;
    }

    if (instanceDate && editMode === 'future') {
      // Cut the series: set until to day before this instance on base event
      const baseEvent = await this.prisma.calendarEvent.findFirst({
        where: { id: eventId, familyId },
      });
      if (!baseEvent) throw new NotFoundException('Event not found');

      const rule = parseRecurrence(baseEvent.recurrence);
      if (!rule) throw new NotFoundException('Event not found');
      const dayBefore = new Date(instanceDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const newUntil = dayBefore.toISOString().slice(0, 10);

      await this.prisma.calendarEvent.update({
        where: { id: eventId },
        data: {
          recurrence: {
            ...rule,
            until: newUntil,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      // Create new recurring event from this instance onwards
      const duration =
        new Date(baseEvent.endAt).getTime() -
        new Date(baseEvent.startAt).getTime();
      const newStart = fields.startAt
        ? new Date(fields.startAt)
        : new Date(instanceDate + baseEvent.startAt.toISOString().slice(10));
      const newEnd = fields.endAt
        ? new Date(fields.endAt)
        : new Date(newStart.getTime() + duration);
      const newRule = recurrence ?? rule;

      const created = await this.prisma.calendarEvent.create({
        data: {
          familyId,
          title: fields.title ?? baseEvent.title,
          description: fields.description ?? baseEvent.description,
          startAt: newStart,
          endAt: newEnd,
          isAllDay: fields.isAllDay ?? baseEvent.isAllDay,
          reminderMinutesBefore:
            fields.reminderMinutesBefore !== undefined
              ? fields.reminderMinutesBefore
              : baseEvent.reminderMinutesBefore,
          assigneeId:
            fields.assigneeId !== undefined
              ? fields.assigneeId
              : baseEvent.assigneeId,
          attendees: baseEvent.attendees as Prisma.InputJsonValue,
          createdBy: userId,
          recurrence: {
            freq: newRule.freq,
            until: newRule.until,
          } as unknown as Prisma.InputJsonValue,
        },
      });
      this.realtimeService.emit(familyId, 'calendar');
      await this.notifyAssignment(
        familyId,
        userId,
        created.assigneeId,
        baseEvent.assigneeId,
        created.title,
      );
      return created;
    }

    // Edit all / standalone event
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id: eventId, familyId },
    });
    if (!event) throw new NotFoundException('Event not found');

    const resetReminder =
      fields.startAt !== undefined ||
      fields.reminderMinutesBefore !== undefined;

    const updated = await this.prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        ...(fields.title !== undefined && { title: fields.title }),
        ...(fields.description !== undefined && {
          description: fields.description,
        }),
        ...(fields.startAt !== undefined && {
          startAt: new Date(fields.startAt),
        }),
        ...(fields.endAt !== undefined && { endAt: new Date(fields.endAt) }),
        ...(fields.isAllDay !== undefined && { isAllDay: fields.isAllDay }),
        ...(fields.reminderMinutesBefore !== undefined && {
          reminderMinutesBefore: fields.reminderMinutesBefore,
        }),
        ...(resetReminder && {
          reminderSentAt: null,
          reminderSentDates: [],
        }),
        ...(recurrence !== undefined && {
          recurrence:
            recurrence === null
              ? Prisma.JsonNull
              : (recurrence as unknown as Prisma.InputJsonValue),
        }),
        ...(fields.assigneeId !== undefined && {
          assigneeId: fields.assigneeId,
        }),
      },
    });
    this.realtimeService.emit(familyId, 'calendar');
    await this.notifyAssignment(
      familyId,
      userId,
      updated.assigneeId,
      event.assigneeId,
      updated.title,
    );
    return updated;
  }

  async deleteEvent(
    familyId: string,
    eventId: string,
    userId: string,
    instanceDate?: string,
  ) {
    await this.requireMember(userId, familyId);

    const event = await this.prisma.calendarEvent.findFirst({
      where: { id: eventId, familyId },
    });
    if (!event) throw new NotFoundException('Event not found');

    if (instanceDate) {
      // Delete just this instance — add to exceptions
      const rule = parseRecurrence(event.recurrence) ?? {
        freq: 'daily' as const,
      };
      const exceptions = [...(rule.exceptions ?? []), instanceDate];
      await this.prisma.calendarEvent.update({
        where: { id: eventId },
        data: {
          recurrence: {
            ...rule,
            exceptions,
          } as unknown as Prisma.InputJsonValue,
        },
      });
      this.realtimeService.emit(familyId, 'calendar');
      return;
    }

    // Delete entire event / series
    await this.prisma.calendarEvent.delete({ where: { id: eventId } });
    this.realtimeService.emit(familyId, 'calendar');
  }

  async rsvpEvent(
    familyId: string,
    eventId: string,
    userId: string,
    dto: RsvpEventDto,
  ) {
    await this.requireMember(userId, familyId);

    let event = await this.prisma.calendarEvent.findFirst({
      where: { id: eventId, familyId },
    });
    if (!event) {
      const underscore = eventId.lastIndexOf('_');
      if (underscore > 0) {
        event = await this.prisma.calendarEvent.findFirst({
          where: { id: eventId.slice(0, underscore), familyId },
        });
      }
    }
    if (!event) throw new NotFoundException('Event not found');

    const attendees = parseAttendees(event.attendees).filter(
      (a) => a.userId !== userId,
    );
    const bringing = dto.bringing?.trim();
    attendees.push({
      userId,
      status: dto.status,
      ...(bringing && dto.status !== 'no' ? { bringing } : {}),
    });

    const updated = await this.prisma.calendarEvent.update({
      where: { id: event.id },
      data: { attendees: attendees as Prisma.InputJsonValue },
    });
    this.realtimeService.emit(familyId, 'calendar');
    return updated;
  }
}
