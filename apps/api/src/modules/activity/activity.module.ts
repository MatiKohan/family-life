import { Module, forwardRef } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { PrismaModule } from '../../database/prisma.module';
import { FamilyModule } from '../family/family.module';

@Module({
  imports: [PrismaModule, forwardRef(() => FamilyModule)],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
