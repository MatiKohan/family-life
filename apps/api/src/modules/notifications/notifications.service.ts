import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  INotificationChannel,
  NOTIFICATION_CHANNELS,
} from './channels/notification-channel.interface';
import { PushService } from '../push/push.service';
import {
  activityBody,
  formatEventWhen,
  normalizeLocale,
  tNotification,
  type AppLocale,
  type FamilyActivityKind,
} from './notification-i18n';

export type { FamilyActivityKind };

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(NOTIFICATION_CHANNELS)
    private readonly channels: INotificationChannel[],
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

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

  private async pushByLocale(
    entries: Array<{ userId: string; locale: AppLocale }>,
    build: (locale: AppLocale) => { title: string; body: string; url?: string },
  ): Promise<void> {
    const groups = new Map<AppLocale, string[]>();
    for (const entry of entries) {
      const ids = groups.get(entry.locale) ?? [];
      ids.push(entry.userId);
      groups.set(entry.locale, ids);
    }
    await Promise.all(
      [...groups.entries()].map(([locale, userIds]) =>
        this.push.sendToUsers(userIds, build(locale)),
      ),
    );
  }

  async sendInviteNotification(
    phone: string,
    inviteUrl: string,
    familyName: string,
    familyEmoji: string,
    locale: AppLocale = 'en',
  ): Promise<void> {
    const body = tNotification(locale, 'invite', {
      emoji: familyEmoji,
      familyName,
      inviteUrl,
    });

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
      include: { user: { select: { locale: true } } },
    });

    const pushEntries: Array<{ userId: string; locale: AppLocale }> = [];

    for (const member of members) {
      const settings = (member.notificationSettings ?? {}) as Record<
        string,
        boolean
      >;
      if (settings.eventReminder === false) continue;

      const locale = normalizeLocale(member.user.locale);
      pushEntries.push({ userId: member.userId, locale });

      if (!member.whatsappPhone) continue;

      const timeLabel = formatEventWhen(startAt, locale);
      const body = tNotification(locale, 'reminder_wa', {
        emoji: familyEmoji,
        eventTitle,
        timeLabel,
      });

      await this.deliver('whatsapp', member.whatsappPhone, body, 'reminder', {
        familyId,
        eventId,
        eventTitle,
      });
    }

    await this.pushByLocale(pushEntries, (locale) => ({
      title: `${familyEmoji} ${familyName}`,
      body: tNotification(locale, 'reminder_push', {
        eventTitle,
        timeLabel: formatEventWhen(startAt, locale),
      }),
      url: `/family/${familyId}/calendar?event=${eventId}`,
    }));
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
      include: { user: { select: { locale: true } } },
    });

    if (!member) return;

    const settings = (member.notificationSettings ?? {}) as Record<
      string,
      boolean
    >;
    if (settings.itemAssigned === false) return;

    const locale = normalizeLocale(member.user.locale);
    const vars = {
      emoji: familyEmoji,
      familyName,
      itemText,
    };

    if (member.whatsappPhone) {
      await this.deliver(
        'whatsapp',
        member.whatsappPhone,
        tNotification(locale, 'assigned_wa', vars),
        'assignment',
        {
          familyId,
          assigneeUserId,
          itemText,
          familyName,
        },
      );
    }

    await this.push.sendToUser(assigneeUserId, {
      title: `${familyEmoji} ${familyName}`,
      body: tNotification(locale, 'assigned_push', vars),
      url: `/family/${familyId}`,
    });
  }

  /**
   * Web Push to family members except the actor (and any extra excluded ids).
   * Does not send WhatsApp. Pref `itemAdded` defaults on unless set to false.
   */
  async sendFamilyActivityNotification(opts: {
    familyId: string;
    actorUserId: string;
    excludeUserIds?: Array<string | null | undefined>;
    activity: FamilyActivityKind;
    url: string;
  }): Promise<void> {
    const { familyId, actorUserId, activity, url } = opts;
    const skip = new Set(
      [actorUserId, ...(opts.excludeUserIds ?? [])].filter(
        (id): id is string => !!id,
      ),
    );

    const [family, actor, members] = await Promise.all([
      this.prisma.family.findUnique({
        where: { id: familyId },
        select: { name: true, emoji: true },
      }),
      this.prisma.user.findUnique({
        where: { id: actorUserId },
        select: { name: true },
      }),
      this.prisma.familyMember.findMany({
        where: { familyId },
        include: { user: { select: { locale: true } } },
      }),
    ]);

    if (!family) return;

    const actorName = actor?.name?.trim() ?? '';
    const pushEntries: Array<{ userId: string; locale: AppLocale }> = [];

    for (const member of members) {
      if (skip.has(member.userId)) continue;
      const settings = (member.notificationSettings ?? {}) as Record<
        string,
        boolean
      >;
      if (settings.itemAdded === false) continue;
      pushEntries.push({
        userId: member.userId,
        locale: normalizeLocale(member.user.locale),
      });
    }

    if (pushEntries.length === 0) return;

    await this.pushByLocale(pushEntries, (locale) => ({
      title: `${family.emoji} ${family.name}`,
      body: activityBody(locale, actorName, activity),
      url,
    }));
  }
}
