import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { FamilyModule } from '../family/family.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [FamilyModule, NotificationsModule, ActivityModule],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}
