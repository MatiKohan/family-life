import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { FamilyRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { UpdateMyMemberDto } from './dto/update-my-member.dto';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
} as const;

@Injectable()
export class FamilyService {
  constructor(private readonly prisma: PrismaService) {}

  async createFamily(userId: string, dto: CreateFamilyDto) {
    const family = await this.prisma.family.create({
      data: {
        name: dto.name,
        emoji: dto.emoji ?? '🏠',
        members: {
          create: {
            userId,
            role: FamilyRole.OWNER,
          },
        },
      },
      include: {
        members: {
          include: { user: { select: USER_SELECT } },
        },
        _count: { select: { members: true } },
      },
    });
    return family;
  }

  listFamilies(userId: string) {
    return this.prisma.family.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        _count: { select: { members: true } },
        members: {
          where: { userId },
          select: { role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getFamily(userId: string, familyId: string) {
    await this.requireMember(userId, familyId);
    return this.prisma.family.findUnique({
      where: { id: familyId },
      include: {
        members: {
          include: { user: { select: USER_SELECT } },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { members: true } },
      },
    });
  }

  async updateFamily(userId: string, familyId: string, dto: UpdateFamilyDto) {
    await this.requireRole(userId, familyId, [
      FamilyRole.ADMIN,
      FamilyRole.OWNER,
    ]);
    return this.prisma.family.update({
      where: { id: familyId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.emoji !== undefined && { emoji: dto.emoji }),
      },
      include: {
        _count: { select: { members: true } },
      },
    });
  }

  async deleteFamily(userId: string, familyId: string) {
    await this.requireRole(userId, familyId, [FamilyRole.OWNER]);
    await this.prisma.family.delete({ where: { id: familyId } });
  }

  async listMembers(userId: string, familyId: string) {
    await this.requireMember(userId, familyId);
    return this.prisma.familyMember.findMany({
      where: { familyId },
      include: { user: { select: USER_SELECT } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async updateMemberRole(
    requestingUserId: string,
    familyId: string,
    targetUserId: string,
    role: FamilyRole,
  ) {
    await this.requireRole(requestingUserId, familyId, [FamilyRole.OWNER]);

    if (requestingUserId === targetUserId) {
      throw new ForbiddenException('Cannot change your own role');
    }

    const target = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Member not found');

    return this.prisma.familyMember.update({
      where: { familyId_userId: { familyId, userId: targetUserId } },
      data: { role },
      include: { user: { select: USER_SELECT } },
    });
  }

  async removeMember(
    requestingUserId: string,
    familyId: string,
    targetUserId: string,
  ) {
    const requester = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: requestingUserId } },
    });
    if (!requester) throw new ForbiddenException('Not a member of this family');

    const isSelf = requestingUserId === targetUserId;
    const isAdminOrOwner =
      requester.role === FamilyRole.OWNER ||
      requester.role === FamilyRole.ADMIN;

    if (!isSelf && !isAdminOrOwner) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const target = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Member not found');

    // Prevent removing the last OWNER
    if (target.role === FamilyRole.OWNER) {
      const ownerCount = await this.prisma.familyMember.count({
        where: { familyId, role: FamilyRole.OWNER },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException(
          'Cannot remove the last owner. Transfer ownership first.',
        );
      }
    }

    await this.prisma.familyMember.delete({
      where: { familyId_userId: { familyId, userId: targetUserId } },
    });
  }

  // --- helpers ---

  async requireMember(userId: string, familyId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this family');
    return member;
  }

  async requireRole(userId: string, familyId: string, roles: FamilyRole[]) {
    const member = await this.requireMember(userId, familyId);
    if (!roles.includes(member.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return member;
  }

  async updateMyMember(
    userId: string,
    familyId: string,
    dto: UpdateMyMemberDto,
  ) {
    await this.requireMember(userId, familyId);
    return this.prisma.familyMember.update({
      where: { familyId_userId: { familyId, userId } },
      data: {
        ...(dto.whatsappPhone !== undefined && {
          whatsappPhone: dto.whatsappPhone,
        }),
        ...(dto.notificationSettings !== undefined && {
          notificationSettings: { ...dto.notificationSettings },
        }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async addMemberByInvite(userId: string, familyId: string): Promise<void> {
    const existing = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (existing)
      throw new ConflictException('Already a member of this family');

    await this.prisma.familyMember.create({
      data: { familyId, userId, role: FamilyRole.MEMBER },
    });
  }
}
