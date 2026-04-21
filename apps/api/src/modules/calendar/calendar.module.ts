import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { IcsService } from './ics.service';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [CalendarController],
  providers: [CalendarService, IcsService],
  exports: [CalendarService],
})
export class CalendarModule {}
