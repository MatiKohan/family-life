import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from './notifications.service';

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
    // Find events whose reminder window falls within the last minute
    const windowStart = new Date(now.getTime() - 60_000);

    const events = await this.prisma.calendarEvent.findMany({
      where: {
        reminderMinutesBefore: { not: null },
        reminderSentAt: null,
      },
      include: { family: true },
    });

    for (const event of events) {
      const reminderAt = new Date(
        event.startAt.getTime() - (event.reminderMinutesBefore ?? 0) * 60_000,
      );

      if (reminderAt >= windowStart && reminderAt <= now) {
        this.logger.log(`Sending reminder for event "${event.title}" (${event.id})`);

        await this.notifications.sendEventReminderNotification(
          event.familyId,
          event.id,
          event.title,
          event.startAt,
          event.family.name,
          event.family.emoji,
        );

        await this.prisma.calendarEvent.update({
          where: { id: event.id },
          data: { reminderSentAt: now },
        });
      }
    }
  }
}
