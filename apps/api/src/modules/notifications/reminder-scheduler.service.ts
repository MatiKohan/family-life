import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from './notifications.service';
import {
  expandEvent,
  instanceDateUtc,
  parseRecurrence,
} from '../calendar/calendar-recurrence';

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sendDueReminders(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60_000);

    const events = await this.prisma.calendarEvent.findMany({
      where: {
        reminderMinutesBefore: { not: null },
      },
      include: { family: true },
    });

    for (const event of events) {
      const minutes = event.reminderMinutesBefore ?? 0;
      const recurrence = parseRecurrence(event.recurrence);

      if (!recurrence) {
        if (event.reminderSentAt) continue;
        const reminderAt = new Date(
          event.startAt.getTime() - minutes * 60_000,
        );
        if (reminderAt >= windowStart && reminderAt <= now) {
          await this.fireReminder(event, event.startAt);
          await this.prisma.calendarEvent.update({
            where: { id: event.id },
            data: { reminderSentAt: now },
          });
        }
        continue;
      }

      const sent = new Set(event.reminderSentDates ?? []);
      const pad = minutes * 60_000 + 60_000;
      const instances = expandEvent(
        event as unknown as Record<string, unknown>,
        new Date(windowStart.getTime() - pad),
        new Date(now.getTime() + pad),
      );

      const datesToMark: string[] = [];
      for (const instance of instances) {
        const startAt = new Date(instance['startAt'] as string);
        const dateStr =
          (instance['instanceDate'] as string | undefined) ??
          instanceDateUtc(startAt);
        if (sent.has(dateStr)) continue;
        const reminderAt = new Date(startAt.getTime() - minutes * 60_000);
        if (reminderAt >= windowStart && reminderAt <= now) {
          await this.fireReminder(event, startAt);
          datesToMark.push(dateStr);
        }
      }

      if (datesToMark.length > 0) {
        await this.prisma.calendarEvent.update({
          where: { id: event.id },
          data: {
            reminderSentDates: [...sent, ...datesToMark],
          },
        });
      }
    }
  }

  private async fireReminder(
    event: {
      id: string;
      familyId: string;
      title: string;
      family: { name: string; emoji: string };
    },
    startAt: Date,
  ): Promise<void> {
    this.logger.log(
      `Sending reminder for event "${event.title}" (${event.id})`,
    );
    await this.notifications.sendEventReminderNotification(
      event.familyId,
      event.id,
      event.title,
      startAt,
      event.family.name,
      event.family.emoji,
    );
  }
}
