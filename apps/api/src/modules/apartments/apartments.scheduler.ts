import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApartmentsService } from './apartments.service';

@Injectable()
export class ApartmentsScheduler {
  private readonly logger = new Logger(ApartmentsScheduler.name);

  constructor(private readonly apartmentsService: ApartmentsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async dailySync(): Promise<void> {
    this.logger.log('Running daily apartments sync');
    await this.apartmentsService.syncAll();
  }
}
