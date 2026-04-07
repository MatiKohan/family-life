import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../../database/prisma.service';
import { SubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const subject = this.config.get<string>('VAPID_SUBJECT');
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');

    if (!subject || !publicKey || !privateKey) {
      this.logger.warn(
        'VAPID env vars missing (VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY) — web push notifications are disabled',
      );
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.logger.log('Web push VAPID details configured');
  }

  async subscribe(userId: string, dto: SubscribeDto): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      update: { p256dh: dto.p256dh, auth: dto.auth },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.p256dh,
        auth: dto.auth,
      },
    });
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: { endpoint, userId },
    });
  }

  async sendToUser(
    userId: string,
    payload: { title: string; body: string; url?: string },
  ): Promise<void> {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify(payload),
          );
        } catch (err: unknown) {
          const status =
            err instanceof Error && 'statusCode' in err
              ? (err as { statusCode: number }).statusCode
              : undefined;

          if (status === 410 || status === 404) {
            this.logger.log(
              `Push subscription gone (${status}), removing endpoint: ${sub.endpoint}`,
            );
            await this.prisma.pushSubscription.deleteMany({
              where: { endpoint: sub.endpoint },
            });
          } else {
            this.logger.error(
              `Failed to send push to userId=${userId} endpoint=${sub.endpoint}: ${String(err)}`,
            );
          }
        }
      }),
    );
  }

  async sendToUsers(
    userIds: string[],
    payload: { title: string; body: string; url?: string },
  ): Promise<void> {
    await Promise.allSettled(
      userIds.map((userId) => this.sendToUser(userId, payload)),
    );
  }
}
