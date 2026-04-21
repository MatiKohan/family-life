import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { IcsService } from './ics.service';
import { PrismaService } from '../../database/prisma.service';

const FAMILY_ID = 'family-1';
const USER_ID = 'user-1';
const TOKEN = 'test-uuid-token';

const mockMember = {
  id: 'member-1',
  familyId: FAMILY_ID,
  userId: USER_ID,
  role: 'MEMBER',
};

const mockAdminMember = {
  ...mockMember,
  role: 'ADMIN',
};

const mockOwnerMember = {
  ...mockMember,
  role: 'OWNER',
};

const mockFamily = {
  id: FAMILY_ID,
  name: 'Test Family',
  calendarToken: null,
};

const mockFamilyWithToken = {
  ...mockFamily,
  calendarToken: TOKEN,
};

const mockEvent = {
  id: 'event-1',
  familyId: FAMILY_ID,
  title: 'Birthday Party',
  description: 'A birthday party',
  startAt: new Date('2026-05-01T10:00:00Z'),
  endAt: new Date('2026-05-01T12:00:00Z'),
  isAllDay: false,
};

const prismaMock = {
  familyMember: {
    findUnique: jest.fn(),
  },
  family: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  calendarEvent: {
    findMany: jest.fn(),
  },
};

describe('IcsService', () => {
  let service: IcsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IcsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<IcsService>(IcsService);
    jest.clearAllMocks();
  });

  describe('getOrCreateToken', () => {
    it('throws ForbiddenException when user is not a member', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.getOrCreateToken(USER_ID, FAMILY_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when family does not exist', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);
      prismaMock.family.findUnique.mockResolvedValue(null);

      await expect(
        service.getOrCreateToken(USER_ID, FAMILY_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns existing token when family already has one', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);
      prismaMock.family.findUnique.mockResolvedValue(mockFamilyWithToken);

      const result = await service.getOrCreateToken(USER_ID, FAMILY_ID);

      expect(result).toBe(TOKEN);
      expect(prismaMock.family.update).not.toHaveBeenCalled();
    });

    it('generates and persists a new token when family has none', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);
      prismaMock.family.findUnique.mockResolvedValue(mockFamily);
      prismaMock.family.update.mockResolvedValue({
        ...mockFamily,
        calendarToken: 'new-uuid',
      });

      const result = await service.getOrCreateToken(USER_ID, FAMILY_ID);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(prismaMock.family.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: FAMILY_ID },
          data: expect.objectContaining({ calendarToken: result }),
        }),
      );
    });
  });

  describe('regenerateToken', () => {
    it('throws ForbiddenException when user is not a member', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(null);

      await expect(service.regenerateToken(USER_ID, FAMILY_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when member role is MEMBER', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);

      await expect(service.regenerateToken(USER_ID, FAMILY_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows ADMIN to regenerate token', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(mockAdminMember);
      prismaMock.family.update.mockResolvedValue({
        ...mockFamily,
        calendarToken: 'new-token',
      });

      const result = await service.regenerateToken(USER_ID, FAMILY_ID);

      expect(typeof result).toBe('string');
      expect(prismaMock.family.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: FAMILY_ID },
          data: expect.objectContaining({ calendarToken: result }),
        }),
      );
    });

    it('allows OWNER to regenerate token', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(mockOwnerMember);
      prismaMock.family.update.mockResolvedValue({
        ...mockFamily,
        calendarToken: 'new-token',
      });

      const result = await service.regenerateToken(USER_ID, FAMILY_ID);

      expect(typeof result).toBe('string');
      expect(prismaMock.family.update).toHaveBeenCalled();
    });
  });

  describe('generateIcs', () => {
    it('throws ForbiddenException when family is not found', async () => {
      prismaMock.family.findUnique.mockResolvedValue(null);

      await expect(service.generateIcs(FAMILY_ID, TOKEN)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when token does not match', async () => {
      prismaMock.family.findUnique.mockResolvedValue(mockFamilyWithToken);

      await expect(
        service.generateIcs(FAMILY_ID, 'wrong-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns ICS string with correct content-type structure', async () => {
      prismaMock.family.findUnique.mockResolvedValue(mockFamilyWithToken);
      prismaMock.calendarEvent.findMany.mockResolvedValue([mockEvent]);

      const result = await service.generateIcs(FAMILY_ID, TOKEN);

      expect(typeof result).toBe('string');
      expect(result).toContain('BEGIN:VCALENDAR');
      expect(result).toContain('END:VCALENDAR');
      expect(result).toContain('Birthday Party');
    });

    it('returns ICS with no events when family has none', async () => {
      prismaMock.family.findUnique.mockResolvedValue(mockFamilyWithToken);
      prismaMock.calendarEvent.findMany.mockResolvedValue([]);

      const result = await service.generateIcs(FAMILY_ID, TOKEN);

      expect(result).toContain('BEGIN:VCALENDAR');
      expect(result).toContain('END:VCALENDAR');
      expect(result).not.toContain('BEGIN:VEVENT');
    });
  });
});
