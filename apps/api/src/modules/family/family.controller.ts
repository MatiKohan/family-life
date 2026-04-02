import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FamilyService } from './family.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '@family-life/types';

@ApiTags('families')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('families')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Post()
  createFamily(@CurrentUser() user: AuthUser, @Body() dto: CreateFamilyDto) {
    return this.familyService.createFamily(user.id, dto);
  }

  @Get()
  listFamilies(@CurrentUser() user: AuthUser) {
    return this.familyService.listFamilies(user.id);
  }

  @Get(':id')
  getFamily(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.familyService.getFamily(user.id, id);
  }

  @Patch(':id')
  updateFamily(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateFamilyDto,
  ) {
    return this.familyService.updateFamily(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFamily(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.familyService.deleteFamily(user.id, id);
  }

  @Get(':id/members')
  listMembers(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.familyService.listMembers(user.id, id);
  }

  @Patch(':id/members/:userId')
  updateMemberRole(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.familyService.updateMemberRole(
      user.id,
      familyId,
      targetUserId,
      dto.role,
    );
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('userId') targetUserId: string,
  ) {
    await this.familyService.removeMember(user.id, familyId, targetUserId);
  }
}
