import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { InvitesService } from './invites.service';
import { CreateLinkInviteDto } from './dto/create-link-invite.dto';
import { CreateTargetedInviteDto } from './dto/create-targeted-invite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '@family-life/types';

@ApiTags('invites')
@Controller()
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post('families/:id/invites/link')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createLinkInvite(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Body() dto: CreateLinkInviteDto,
  ) {
    return this.invitesService.createLinkInvite(user.id, familyId, dto);
  }

  @Post('families/:id/invites/targeted')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createTargetedInvite(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Body() dto: CreateTargetedInviteDto,
  ) {
    return this.invitesService.createTargetedInvite(user.id, familyId, dto);
  }

  @Get('families/:id/invites')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listInvites(@CurrentUser() user: AuthUser, @Param('id') familyId: string) {
    return this.invitesService.listInvites(user.id, familyId);
  }

  @Delete('families/:id/invites/:inviteId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeInvite(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('inviteId') inviteId: string,
  ) {
    await this.invitesService.revokeInvite(user.id, familyId, inviteId);
  }

  /**
   * Public endpoint — JWT is optional.
   * OptionalJwtAuthGuard populates req.user when a valid token is present
   * but does NOT throw when no token is provided.
   */
  @Post('invites/join/:token')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  redeemInvite(@Req() req: Request, @Param('token') token: string) {
    const user = req.user as AuthUser | undefined;
    return this.invitesService.redeemInvite(token, user?.id);
  }
}
