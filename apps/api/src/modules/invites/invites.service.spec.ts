import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, GoneException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InviteStatus, FamilyRole } from '@prisma/client';
import { InvitesService } from './invites.service';
import { FamilyService } from '../family/family.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockPrisma = {
  familyInvite: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  family: {
    findUnique: jest.fn(),
  },
};

const mockFamilyService = {
  requireRole: jest.fn(),
  addMemberByInvite: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('http://localhost:5173'),
};

const mockNotificationsService = {
  sendInviteNotification: jest.fn(),
};

const USER_ID = 'user-1';
const FAMILY_ID = 'family-1';
const INVITE_TOKEN = 'token-abc';
const INVITE_ID = 'invite-1';

const pendingInvite = {
  id: INVITE_ID,
  familyId: FAMILY_ID,
  token: INVITE_TOKEN,
  email: null,
  phone: null,
  status: InviteStatus.PENDING,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdBy: USER_ID,
  createdAt: new Date(),
  family: { id: FAMILY_ID, name: 'Test Family' },
};

describe('InvitesService', () => {
  let service: InvitesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FamilyService, useValue: mockFamilyService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<InvitesService>(InvitesService);
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('http://localhost:5173');
  });

  describe('createLinkInvite', () => {
    it('checks ADMIN+ role and returns token and inviteUrl', async () => {
      mockFamilyService.requireRole.mockResolvedValue(undefined);
      mockPrisma.familyInvite.create.mockResolvedValue(pendingInvite);

      const result = await service.createLinkInvite(USER_ID, FAMILY_ID, {});

      expect(mockFamilyService.requireRole).toHaveBeenCalledWith(
        USER_ID,
        FAMILY_ID,
        [FamilyRole.ADMIN, FamilyRole.OWNER],
      );
      expect(result.token).toBe(INVITE_TOKEN);
      expect(result.inviteUrl).toBe(
        `http://localhost:5173/join/${INVITE_TOKEN}`,
      );
    });

    it('uses default 7 days expiry when not specified', async () => {
      mockFamilyService.requireRole.mockResolvedValue(undefined);
      mockPrisma.familyInvite.create.mockResolvedValue(pendingInvite);

      await service.createLinkInvite(USER_ID, FAMILY_ID, {});

      const createCall = mockPrisma.familyInvite.create.mock.calls[0][0];
      const expiresAt: Date = createCall.data.expiresAt;
      const expectedMs = 7 * 24 * 60 * 60 * 1000;
      expect(expiresAt.getTime() - Date.now()).toBeGreaterThan(
        expectedMs - 5000,
      );
      expect(expiresAt.getTime() - Date.now()).toBeLessThan(expectedMs + 5000);
    });
  });

  describe('createTargetedInvite', () => {
    it('creates invite with email and phone', async () => {
      mockFamilyService.requireRole.mockResolvedValue(undefined);
      const inviteWithContact = {
        ...pendingInvite,
        email: 'a@b.com',
        phone: '+1234',
      };
      mockPrisma.familyInvite.create.mockResolvedValue(inviteWithContact);
      mockPrisma.family.findUnique.mockResolvedValue({
        name: 'Test Family',
        emoji: '🏠',
      });
      mockNotificationsService.sendInviteNotification.mockResolvedValue(
        undefined,
      );

      const result = await service.createTargetedInvite(USER_ID, FAMILY_ID, {
        email: 'a@b.com',
        phone: '+1234',
      });

      expect(result.email).toBe('a@b.com');
    });

    it('calls sendInviteNotification with correct args when phone is provided', async () => {
      mockFamilyService.requireRole.mockResolvedValue(undefined);
      const inviteWithPhone = {
        ...pendingInvite,
        phone: '+15551234567',
        token: INVITE_TOKEN,
      };
      mockPrisma.familyInvite.create.mockResolvedValue(inviteWithPhone);
      mockPrisma.family.findUnique.mockResolvedValue({
        name: 'Test Family',
        emoji: '🏠',
      });
      mockNotificationsService.sendInviteNotification.mockResolvedValue(
        undefined,
      );

      await service.createTargetedInvite(USER_ID, FAMILY_ID, {
        phone: '+15551234567',
      });

      // Allow the fire-and-forget void promise to resolve
      await Promise.resolve();

      expect(mockNotificationsService.sendInviteNotification).toHaveBeenCalledWith(
        '+15551234567',
        `http://localhost:5173/join/${INVITE_TOKEN}`,
        'Test Family',
        '🏠',
      );
    });

    it('does NOT call sendInviteNotification when phone is not provided', async () => {
      mockFamilyService.requireRole.mockResolvedValue(undefined);
      const inviteNoPhone = { ...pendingInvite, email: 'a@b.com', phone: null };
      mockPrisma.familyInvite.create.mockResolvedValue(inviteNoPhone);

      await service.createTargetedInvite(USER_ID, FAMILY_ID, {
        email: 'a@b.com',
      });

      expect(mockNotificationsService.sendInviteNotification).not.toHaveBeenCalled();
    });
  });

  describe('listInvites', () => {
    it('returns only PENDING non-expired invites', async () => {
      mockFamilyService.requireRole.mockResolvedValue(undefined);
      mockPrisma.familyInvite.findMany.mockResolvedValue([pendingInvite]);

      const result = await service.listInvites(USER_ID, FAMILY_ID);

      expect(mockPrisma.familyInvite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            familyId: FAMILY_ID,
            status: InviteStatus.PENDING,
          }),
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('revokeInvite', () => {
    it('throws NotFoundException when invite not found', async () => {
      mockFamilyService.requireRole.mockResolvedValue(undefined);
      mockPrisma.familyInvite.findFirst.mockResolvedValue(null);

      await expect(
        service.revokeInvite(USER_ID, FAMILY_ID, INVITE_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('deletes invite when found', async () => {
      mockFamilyService.requireRole.mockResolvedValue(undefined);
      mockPrisma.familyInvite.findFirst.mockResolvedValue(pendingInvite);
      mockPrisma.familyInvite.delete.mockResolvedValue(pendingInvite);

      await service.revokeInvite(USER_ID, FAMILY_ID, INVITE_ID);
      expect(mockPrisma.familyInvite.delete).toHaveBeenCalledWith({
        where: { id: INVITE_ID },
      });
    });
  });

  describe('redeemInvite', () => {
    it('returns requiresAuth when userId is undefined', async () => {
      const result = await service.redeemInvite(INVITE_TOKEN, undefined);
      expect(result).toEqual({ requiresAuth: true, token: INVITE_TOKEN });
    });

    it('throws NotFoundException when token not found', async () => {
      mockPrisma.familyInvite.findUnique.mockResolvedValue(null);
      await expect(service.redeemInvite(INVITE_TOKEN, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws GoneException when invite is already accepted', async () => {
      mockPrisma.familyInvite.findUnique.mockResolvedValue({
        ...pendingInvite,
        status: InviteStatus.ACCEPTED,
      });
      await expect(service.redeemInvite(INVITE_TOKEN, USER_ID)).rejects.toThrow(
        GoneException,
      );
    });

    it('throws GoneException when invite is expired', async () => {
      mockPrisma.familyInvite.findUnique.mockResolvedValue({
        ...pendingInvite,
        expiresAt: new Date(Date.now() - 1000),
      });
      mockPrisma.familyInvite.update.mockResolvedValue({});

      await expect(service.redeemInvite(INVITE_TOKEN, USER_ID)).rejects.toThrow(
        GoneException,
      );
    });

    it('adds user as member and marks invite ACCEPTED on success', async () => {
      mockPrisma.familyInvite.findUnique.mockResolvedValue(pendingInvite);
      mockFamilyService.addMemberByInvite.mockResolvedValue(undefined);
      mockPrisma.familyInvite.update.mockResolvedValue({});

      const result = await service.redeemInvite(INVITE_TOKEN, USER_ID);

      expect(mockFamilyService.addMemberByInvite).toHaveBeenCalledWith(
        USER_ID,
        FAMILY_ID,
      );
      expect(mockPrisma.familyInvite.update).toHaveBeenCalledWith({
        where: { id: INVITE_ID },
        data: { status: InviteStatus.ACCEPTED },
      });
      expect(result).toEqual({
        familyId: FAMILY_ID,
        familyName: 'Test Family',
      });
    });
  });
});
