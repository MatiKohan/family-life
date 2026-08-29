import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '@family-life/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('families/:familyId/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getDashboard(
    @CurrentUser() user: AuthUser,
    @Param('familyId') familyId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const now = new Date();
    const dayStart =
      start ??
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const dayEnd =
      end ??
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      ).toISOString();
    return this.dashboardService.getDashboard(
      user.id,
      familyId,
      dayStart,
      dayEnd,
    );
  }
}
