import { Module } from '@nestjs/common';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { RecurringTaskScheduler } from './recurring-task.scheduler';
import { PrismaModule } from '../../database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [PrismaModule, NotificationsModule, ActivityModule],
  controllers: [PagesController],
  providers: [PagesService, RecurringTaskScheduler],
  exports: [PagesService],
})
export class PagesModule {}
