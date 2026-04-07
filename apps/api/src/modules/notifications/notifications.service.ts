import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  INotificationChannel,
  NOTIFICATION_CHANNELS,
} from './channels/notification-channel.interface';
import { PushService } from '../push/push.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(NOTIFICATION_CHANNELS)
    private readonly channels: INotificationChannel[],
    private readonly prisma: PrismaService,
    private readonly push: PushService,
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

    const pushUserIds: string[] = [];

    for (const member of members) {
      const settings = (member.notificationSettings ?? {}) as Record<
        string,
        boolean
      >;
      if (settings.eventReminder === false) continue;

      pushUserIds.push(member.userId);

      if (!member.whatsappPhone) continue;

      await this.deliver('whatsapp', member.whatsappPhone, body, 'reminder', {
        familyId,
        eventId,
        eventTitle,
      });
    }

    await this.push.sendToUsers(pushUserIds, {
      title: `${familyEmoji} ${familyName}`,
      body: `Reminder: ${eventTitle} on ${timeLabel}`,
      url: '/',
    });
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

    if (!member) return;

    const settings = (member.notificationSettings ?? {}) as Record<
      string,
      boolean
    >;
    if (settings.itemAssigned === false) return;

    const body =
      `${familyEmoji} You've been assigned a task in *${familyName}*:\n\n` +
      `"${itemText}"`;

    if (member.whatsappPhone) {
      await this.deliver('whatsapp', member.whatsappPhone, body, 'assignment', {
        familyId,
        assigneeUserId,
        itemText,
        familyName,
      });
    }

    await this.push.sendToUser(assigneeUserId, {
      title: `${familyEmoji} ${familyName}`,
      body: `You were assigned: ${itemText}`,
      url: '/',
    });
  }
}
