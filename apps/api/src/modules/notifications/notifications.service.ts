import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  INotificationChannel,
  NOTIFICATION_CHANNELS,
} from './channels/notification-channel.interface';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(NOTIFICATION_CHANNELS)
    private readonly channels: INotificationChannel[],
    private readonly prisma: PrismaService,
  ) {}

  // ─── Internal dispatch ────────────────────────────────────────────────────

  private getChannel(name: string): INotificationChannel | undefined {
    return this.channels.find((c) => c.channelName === name && c.isConfigured);
  }

  private async deliver(
    channelName: string,
    to: string,
    body: string,
    type: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const channel = this.getChannel(channelName);
    if (!channel) return;

    let status: 'sent' | 'failed' = 'sent';
    let error: string | undefined;

    try {
      await channel.send(to, body);
    } catch (err) {
      status = 'failed';
      error = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[${channelName}] Failed to send (${type}) to ${to}: ${error}`,
      );
    }

    try {
      await this.prisma.notificationLog.create({
        data: {
          type,
          channel: channelName,
          to,
          status,
          error,
          metadata: metadata as object,
        },
      });
    } catch (err) {
      this.logger.error(
        `[${channelName}] Failed to write notification log: ${String(err)}`,
      );
    }
  }

  // ─── Public notification methods ─────────────────────────────────────────

  async sendInviteNotification(
    phone: string,
    inviteUrl: string,
    familyName: string,
    familyEmoji: string,
  ): Promise<void> {
    const body =
      `${familyEmoji} You've been invited to join *${familyName}* on Family Life!\n\n` +
      `Tap here to join: ${inviteUrl}`;

    await this.deliver('whatsapp', phone, body, 'invite', {
      inviteUrl,
      familyName,
    });
  }

  async sendEventReminderNotification(
    familyId: string,
    eventId: string,
    eventTitle: string,
    startAt: Date,
    familyName: string,
    familyEmoji: string,
  ): Promise<void> {
    const members = await this.prisma.familyMember.findMany({
      where: { familyId },
    });

    const timeLabel = startAt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const body = `${familyEmoji} Reminder: *${eventTitle}* is coming up on ${timeLabel}`;

    for (const member of members) {
      if (!member.whatsappPhone) continue;
      const settings = (member.notificationSettings ?? {}) as Record<
        string,
        boolean
      >;
      if (settings.eventReminder === false) continue;

      await this.deliver('whatsapp', member.whatsappPhone, body, 'reminder', {
        familyId,
        eventId,
        eventTitle,
      });
    }
  }

  async sendAssignmentNotification(
    familyId: string,
    assigneeUserId: string,
    itemText: string,
    familyName: string,
    familyEmoji: string,
  ): Promise<void> {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: assigneeUserId } },
    });

    if (!member?.whatsappPhone) return;

    const settings = (member.notificationSettings ?? {}) as Record<
      string,
      boolean
    >;
    if (settings.itemAssigned === false) return;

    const body =
      `${familyEmoji} You've been assigned a task in *${familyName}*:\n\n` +
      `"${itemText}"`;

    await this.deliver('whatsapp', member.whatsappPhone, body, 'assignment', {
      familyId,
      assigneeUserId,
      itemText,
      familyName,
    });
  }
}
