import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { FamilyModule } from '../family/family.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [FamilyModule, NotificationsModule],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}
