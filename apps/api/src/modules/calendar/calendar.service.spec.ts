import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { PrismaService } from '../../database/prisma.service';

const FAMILY_ID = 'family-1';
const USER_ID = 'user-1';
const EVENT_ID = 'event-1';

const mockMember = { id: 'member-1', familyId: FAMILY_ID, userId: USER_ID, role: 'MEMBER' };
const mockEvent = {
  id: EVENT_ID,
  familyId: FAMILY_ID,
  title: 'Birthday Party',
  description: null,
  startAt: new Date('2026-05-01T10:00:00Z'),
  endAt: new Date('2026-05-01T12:00:00Z'),
  isAllDay: false,
  createdBy: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const prismaMock = {
  familyMember: {
    findUnique: jest.fn(),
  },
  calendarEvent: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('CalendarService', () => {
  let service: CalendarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    jest.clearAllMocks();
  });

  describe('listEvents', () => {
    it('returns events for a family member', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);
      prismaMock.calendarEvent.findMany.mockResolvedValue([mockEvent]);

      const result = await service.listEvents(FAMILY_ID, USER_ID);

      expect(prismaMock.calendarEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { familyId: FAMILY_ID } }),
      );
      expect(result).toEqual([mockEvent]);
    });

    it('applies date range filter when start and end provided', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);
      prismaMock.calendarEvent.findMany.mockResolvedValue([]);

      await service.listEvents(FAMILY_ID, USER_ID, '2026-05-01', '2026-05-31');

      expect(prismaMock.calendarEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            familyId: FAMILY_ID,
            startAt: {
              gte: new Date('2026-05-01'),
              lte: new Date('2026-05-31'),
            },
          },
        }),
      );
    });

    it('throws ForbiddenException when user is not a member', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(null);

      await expect(service.listEvents(FAMILY_ID, USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createEvent', () => {
    it('creates an event for a family member', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);
      prismaMock.calendarEvent.create.mockResolvedValue(mockEvent);

      const dto = {
        title: 'Birthday Party',
        startAt: '2026-05-01T10:00:00Z',
        endAt: '2026-05-01T12:00:00Z',
      };

      const result = await service.createEvent(FAMILY_ID, USER_ID, dto);

      expect(prismaMock.calendarEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            familyId: FAMILY_ID,
            title: 'Birthday Party',
            createdBy: USER_ID,
          }),
        }),
      );
      expect(result).toEqual(mockEvent);
    });

    it('throws ForbiddenException when user is not a member', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.createEvent(FAMILY_ID, USER_ID, {
          title: 'Party',
          startAt: '2026-05-01T10:00:00Z',
          endAt: '2026-05-01T12:00:00Z',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateEvent', () => {
    it('updates an event', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);
      prismaMock.calendarEvent.findUnique.mockResolvedValue(mockEvent);
      const updated = { ...mockEvent, title: 'Updated Title' };
      prismaMock.calendarEvent.update.mockResolvedValue(updated);

      const result = await service.updateEvent(FAMILY_ID, EVENT_ID, USER_ID, {
        title: 'Updated Title',
      });

      expect(prismaMock.calendarEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: EVENT_ID },
          data: { title: 'Updated Title' },
        }),
      );
      expect(result.title).toBe('Updated Title');
    });

    it('throws NotFoundException when event does not exist', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);
      prismaMock.calendarEvent.findUnique.mockResolvedValue(null);

      await expect(
        service.updateEvent(FAMILY_ID, 'nonexistent', USER_ID, { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when event belongs to another family', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);
      prismaMock.calendarEvent.findUnique.mockResolvedValue({
        ...mockEvent,
        familyId: 'other-family',
      });

      await expect(
        service.updateEvent(FAMILY_ID, EVENT_ID, USER_ID, { title: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteEvent', () => {
    it('deletes an event', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);
      prismaMock.calendarEvent.findUnique.mockResolvedValue(mockEvent);
      prismaMock.calendarEvent.delete.mockResolvedValue(mockEvent);

      await service.deleteEvent(FAMILY_ID, EVENT_ID, USER_ID);

      expect(prismaMock.calendarEvent.delete).toHaveBeenCalledWith({
        where: { id: EVENT_ID },
      });
    });

    it('throws ForbiddenException when user is not a member', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteEvent(FAMILY_ID, EVENT_ID, USER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when event does not exist', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);
      prismaMock.calendarEvent.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteEvent(FAMILY_ID, 'nonexistent', USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
