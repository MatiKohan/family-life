import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { FamilyService } from '../family/family.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '@family-life/types';

@ApiTags('activity')
@ApiBearerAuth()
@Controller('families/:familyId/activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly familyService: FamilyService,
  ) {}

  @Get()
  async getFeed(
    @Param('familyId') familyId: string,
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    await this.familyService.requireMember(user.id, familyId);
    return this.activityService.getFeed(
      familyId,
      limit ? parseInt(limit) : 20,
      cursor,
    );
  }
}
