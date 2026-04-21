import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '@family-life/types';
import { SearchService } from './search.service';

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('families/:familyId/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Param('familyId') familyId: string,
    @Query('q') q: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (!q || q.trim().length < 2) {
      throw new BadRequestException('Query must be at least 2 characters');
    }
    return this.searchService.search(familyId, user.id, q.trim());
  }
}
