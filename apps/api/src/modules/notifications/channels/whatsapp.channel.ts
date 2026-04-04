import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import { INotificationChannel } from './notification-channel.interface';

@Injectable()
export class WhatsAppChannel implements INotificationChannel {
  readonly channelName = 'whatsapp';

  private readonly logger = new Logger(WhatsAppChannel.name);
  private readonly client: ReturnType<typeof twilio> | null = null;
  private readonly from: string | null = null;

  constructor(private readonly config: ConfigService) {
    const sid = config.get<string>('TWILIO_ACCOUNT_SID');
    const token = config.get<string>('TWILIO_AUTH_TOKEN');
    const from = config.get<string>('TWILIO_WHATSAPP_FROM');

    if (sid && token && from) {
      this.client = twilio(sid, token);
      this.from = from;
      this.logger.log('WhatsApp channel initialized');
    } else {
      this.logger.warn('WhatsApp channel not configured — notifications disabled');
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async send(to: string, body: string): Promise<void> {
    if (!this.client || !this.from) return;
    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    await this.client.messages.create({ from: this.from, to: toNumber, body });
  }
}
