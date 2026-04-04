import { Module } from '@nestjs/common';
import { WhatsAppChannel } from './channels/whatsapp.channel';
import { NOTIFICATION_CHANNELS } from './channels/notification-channel.interface';
import { NotificationsService } from './notifications.service';

@Module({
  providers: [
    WhatsAppChannel,
    // To add a new channel (e.g. email):
    //   1. Create EmailChannel implementing INotificationChannel
    //   2. Add EmailChannel to providers
    //   3. Add it to the useFactory array and inject list below
    {
      provide: NOTIFICATION_CHANNELS,
      useFactory: (whatsapp: WhatsAppChannel) => [whatsapp],
      inject: [WhatsAppChannel],
    },
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
