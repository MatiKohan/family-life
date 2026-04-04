import { Injectable, NotFoundException, GoneException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InviteStatus, FamilyRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { FamilyService } from '../family/family.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLinkInviteDto } from './dto/create-link-invite.dto';
import { CreateTargetedInviteDto } from './dto/create-targeted-invite.dto';

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyService: FamilyService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createLinkInvite(
    userId: string,
    familyId: string,
    dto: CreateLinkInviteDto,
  ) {
    await this.familyService.requireRole(userId, familyId, [
      FamilyRole.ADMIN,
      FamilyRole.OWNER,
    ]);

    const days = dto.expiresInDays ?? 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const invite = await this.prisma.familyInvite.create({
      data: { familyId, expiresAt, createdBy: userId },
    });

    const webUrl = this.configService.get<string>(
      'WEB_URL',
      'http://localhost:5173',
    );

    return {
      token: invite.token,
      inviteUrl: `${webUrl}/join/${invite.token}`,
      expiresAt: invite.expiresAt,
    };
  }

  async createTargetedInvite(
    userId: string,
    familyId: string,
    dto: CreateTargetedInviteDto,
  ) {
    await this.familyService.requireRole(userId, familyId, [
      FamilyRole.ADMIN,
      FamilyRole.OWNER,
    ]);

    const days = dto.expiresInDays ?? 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const invite = await this.prisma.familyInvite.create({
      data: {
        familyId,
        email: dto.email,
        phone: dto.phone,
        expiresAt,
        createdBy: userId,
      },
    });

    const webUrl = this.configService.get<string>(
      'WEB_URL',
      'http://localhost:5173',
    );
    const inviteUrl = `${webUrl}/join/${invite.token}`;

    if (dto.phone) {
      const family = await this.prisma.family.findUnique({
        where: { id: familyId },
        select: { name: true, emoji: true },
      });
      if (family) {
        void this.notificationsService.sendInviteNotification(
          dto.phone,
          inviteUrl,
          family.name,
          family.emoji,
        );
      }
    }

    return { ...invite, inviteUrl };
  }

  async listInvites(userId: string, familyId: string) {
    await this.familyService.requireRole(userId, familyId, [
      FamilyRole.ADMIN,
      FamilyRole.OWNER,
    ]);

    const now = new Date();
    return this.prisma.familyInvite.findMany({
      where: {
        familyId,
        status: InviteStatus.PENDING,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeInvite(userId: string, familyId: string, inviteId: string) {
    await this.familyService.requireRole(userId, familyId, [
      FamilyRole.ADMIN,
      FamilyRole.OWNER,
    ]);

    const invite = await this.prisma.familyInvite.findFirst({
      where: { id: inviteId, familyId },
    });
    if (!invite) throw new NotFoundException('Invite not found');

    await this.prisma.familyInvite.delete({ where: { id: inviteId } });
  }

  async getInviteInfo(token: string) {
    const invite = await this.prisma.familyInvite.findUnique({
      where: { token },
      include: { family: { select: { name: true, emoji: true } } },
    });

    if (
      !invite ||
      invite.status !== InviteStatus.PENDING ||
      invite.expiresAt < new Date()
    ) {
      throw new GoneException('Invite is invalid or expired');
    }

    return { familyName: invite.family.name, familyEmoji: invite.family.emoji };
  }

  async redeemInvite(token: string, userId: string | undefined) {
    if (!userId) {
      return { requiresAuth: true, token };
    }

    const invite = await this.prisma.familyInvite.findUnique({
      where: { token },
      include: { family: { select: { id: true, name: true } } },
    });

    if (!invite) throw new NotFoundException('Invite not found');

    if (invite.status !== InviteStatus.PENDING) {
      throw new GoneException('Invite has already been used');
    }

    if (invite.expiresAt < new Date()) {
      await this.prisma.familyInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.EXPIRED },
      });
      throw new GoneException('Invite has expired');
    }

    await this.familyService.addMemberByInvite(userId, invite.familyId);

    await this.prisma.familyInvite.update({
      where: { id: invite.id },
      data: { status: InviteStatus.ACCEPTED },
    });

    return {
      familyId: invite.family.id,
      familyName: invite.family.name,
    };
  }
}
