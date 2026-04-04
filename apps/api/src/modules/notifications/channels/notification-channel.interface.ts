export interface INotificationChannel {
  readonly channelName: string;
  readonly isConfigured: boolean;
  send(to: string, body: string): Promise<void>;
}

export const NOTIFICATION_CHANNELS = Symbol('NOTIFICATION_CHANNELS');
