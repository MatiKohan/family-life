import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '@family-life/types';
import { ApartmentsService } from './apartments.service';
import { UpdateSearchParamsDto } from './dto/update-search-params.dto';

@ApiTags('apartments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('families/:familyId/pages/:pageId/apartments')
export class ApartmentsController {
  constructor(private readonly apartmentsService: ApartmentsService) {}

  @Patch('search-params')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateSearchParams(
    @CurrentUser() user: AuthUser,
    @Param('familyId') familyId: string,
    @Param('pageId') pageId: string,
    @Body() dto: UpdateSearchParamsDto,
  ) {
    await this.apartmentsService.updateSearchParams(
      familyId,
      pageId,
      user.id,
      dto,
    );
  }

  @Post('sync')
  async syncNow(
    @CurrentUser() user: AuthUser,
    @Param('familyId') familyId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.apartmentsService.syncPageForUser(familyId, pageId, user.id);
  }

  @Patch(':listingId/seen')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markSeen(
    @CurrentUser() user: AuthUser,
    @Param('familyId') familyId: string,
    @Param('pageId') pageId: string,
    @Param('listingId') listingId: string,
  ) {
    await this.apartmentsService.markSeen(familyId, pageId, listingId, user.id);
  }
}
