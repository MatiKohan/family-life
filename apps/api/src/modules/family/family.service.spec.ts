import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { FamilyRole } from '@prisma/client';
import { FamilyService } from './family.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrisma = {
  family: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  familyMember: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

const USER_ID = 'user-1';
const FAMILY_ID = 'family-1';
const TARGET_USER_ID = 'user-2';

const ownerMember = {
  id: 'member-1',
  familyId: FAMILY_ID,
  userId: USER_ID,
  role: FamilyRole.OWNER,
  whatsappPhone: null,
  notificationSettings: {},
  joinedAt: new Date(),
};

const memberMember = {
  ...ownerMember,
  id: 'member-2',
  userId: TARGET_USER_ID,
  role: FamilyRole.MEMBER,
};

describe('FamilyService', () => {
  let service: FamilyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FamilyService>(FamilyService);
    jest.clearAllMocks();
  });

  describe('createFamily', () => {
    it('creates a family and adds creator as OWNER', async () => {
      const createdFamily = {
        id: FAMILY_ID,
        name: 'Test Family',
        emoji: '🏠',
        members: [ownerMember],
        _count: { members: 1 },
      };
      mockPrisma.family.create.mockResolvedValue(createdFamily);

      const result = await service.createFamily(USER_ID, {
        name: 'Test Family',
      });

      expect(mockPrisma.family.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Test Family',
            members: { create: { userId: USER_ID, role: FamilyRole.OWNER } },
          }),
        }),
      );
      expect(result.id).toBe(FAMILY_ID);
    });

    it('uses provided emoji', async () => {
      mockPrisma.family.create.mockResolvedValue({
        id: FAMILY_ID,
        emoji: '🌟',
        members: [],
        _count: { members: 1 },
      });
      await service.createFamily(USER_ID, { name: 'Family', emoji: '🌟' });
      expect(mockPrisma.family.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ emoji: '🌟' }),
        }),
      );
    });
  });

  describe('listFamilies', () => {
    it('returns families the user is a member of', async () => {
      const families = [
        {
          id: FAMILY_ID,
          name: 'Family',
          _count: { members: 2 },
          members: [ownerMember],
        },
      ];
      mockPrisma.family.findMany.mockResolvedValue(families);

      const result = await service.listFamilies(USER_ID);

      expect(mockPrisma.family.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { members: { some: { userId: USER_ID } } },
        }),
      );
      expect(result).toEqual(families);
    });
  });

  describe('getFamily', () => {
    it('throws ForbiddenException if user is not a member', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(null);
      await expect(service.getFamily(USER_ID, FAMILY_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns family with members when user is a member', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(ownerMember);
      const familyData = {
        id: FAMILY_ID,
        name: 'Family',
        members: [ownerMember],
        _count: { members: 1 },
      };
      mockPrisma.family.findUnique.mockResolvedValue(familyData);

      const result = await service.getFamily(USER_ID, FAMILY_ID);
      expect(result).toEqual(familyData);
    });
  });

  describe('updateFamily', () => {
    it('throws ForbiddenException if user is not ADMIN or OWNER', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(memberMember);
      await expect(
        service.updateFamily(TARGET_USER_ID, FAMILY_ID, { name: 'New' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates the family when user is OWNER', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(ownerMember);
      mockPrisma.family.update.mockResolvedValue({
        id: FAMILY_ID,
        name: 'New Name',
        _count: { members: 1 },
      });

      const result = await service.updateFamily(USER_ID, FAMILY_ID, {
        name: 'New Name',
      });
      expect(result.name).toBe('New Name');
    });
  });

  describe('deleteFamily', () => {
    it('throws ForbiddenException if user is not OWNER', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(memberMember);
      await expect(
        service.deleteFamily(TARGET_USER_ID, FAMILY_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deletes the family when user is OWNER', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(ownerMember);
      mockPrisma.family.delete.mockResolvedValue({ id: FAMILY_ID });

      await service.deleteFamily(USER_ID, FAMILY_ID);
      expect(mockPrisma.family.delete).toHaveBeenCalledWith({
        where: { id: FAMILY_ID },
      });
    });
  });

  describe('updateMemberRole', () => {
    it('throws ForbiddenException when user tries to change own role', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(ownerMember);
      await expect(
        service.updateMemberRole(USER_ID, FAMILY_ID, USER_ID, FamilyRole.ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when target member does not exist', async () => {
      // First call: requester lookup (owner), second: target lookup (not found)
      mockPrisma.familyMember.findUnique
        .mockResolvedValueOnce(ownerMember)
        .mockResolvedValueOnce(null);

      await expect(
        service.updateMemberRole(
          USER_ID,
          FAMILY_ID,
          TARGET_USER_ID,
          FamilyRole.ADMIN,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates role when OWNER targets another member', async () => {
      mockPrisma.familyMember.findUnique
        .mockResolvedValueOnce(ownerMember)
        .mockResolvedValueOnce(memberMember);
      mockPrisma.familyMember.update.mockResolvedValue({
        ...memberMember,
        role: FamilyRole.ADMIN,
      });

      const result = await service.updateMemberRole(
        USER_ID,
        FAMILY_ID,
        TARGET_USER_ID,
        FamilyRole.ADMIN,
      );
      expect(result.role).toBe(FamilyRole.ADMIN);
    });
  });

  describe('removeMember', () => {
    it('throws ForbiddenException if requester is not a member', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(null);
      await expect(
        service.removeMember(USER_ID, FAMILY_ID, TARGET_USER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when MEMBER tries to remove someone else', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(memberMember);
      await expect(
        service.removeMember(TARGET_USER_ID, FAMILY_ID, USER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows member to remove themselves (self-leave)', async () => {
      mockPrisma.familyMember.findUnique
        .mockResolvedValueOnce(memberMember) // requester
        .mockResolvedValueOnce(memberMember); // target (same user)
      mockPrisma.familyMember.delete.mockResolvedValue(memberMember);

      await service.removeMember(TARGET_USER_ID, FAMILY_ID, TARGET_USER_ID);
      expect(mockPrisma.familyMember.delete).toHaveBeenCalled();
    });

    it('prevents removing the last OWNER', async () => {
      mockPrisma.familyMember.findUnique
        .mockResolvedValueOnce(ownerMember) // requester
        .mockResolvedValueOnce(ownerMember); // target
      mockPrisma.familyMember.count.mockResolvedValue(1);

      await expect(
        service.removeMember(USER_ID, FAMILY_ID, USER_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addMemberByInvite', () => {
    it('throws ConflictException if user is already a member', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(memberMember);
      await expect(
        service.addMemberByInvite(TARGET_USER_ID, FAMILY_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('creates member with MEMBER role', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(null);
      mockPrisma.familyMember.create.mockResolvedValue(memberMember);

      await service.addMemberByInvite(TARGET_USER_ID, FAMILY_ID);
      expect(mockPrisma.familyMember.create).toHaveBeenCalledWith({
        data: {
          familyId: FAMILY_ID,
          userId: TARGET_USER_ID,
          role: FamilyRole.MEMBER,
        },
      });
    });
  });
});
