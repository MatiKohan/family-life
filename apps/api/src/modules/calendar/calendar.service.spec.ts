import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { PrismaService } from '../../database/prisma.service';
import { ActivityService } from '../activity/activity.service';

const FAMILY_ID = 'family-1';
const USER_ID = 'user-1';
const EVENT_ID = 'event-1';

const mockMember = {
  id: 'member-1',
  familyId: FAMILY_ID,
  userId: USER_ID,
  role: 'MEMBER',
};
const mockEvent = {
  id: EVENT_ID,
  familyId: FAMILY_ID,
  title: 'Birthday Party',
  description: null,
  startAt: new Date('2026-05-01T10:00:00Z'),
  endAt: new Date('2026-05-01T12:00:00Z'),
  isAllDay: false,
  recurrence: null,
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
    findFirst: jest.fn(),
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
        { provide: ActivityService, useValue: { log: jest.fn() } },
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
        expect.objectContaining({
          where: expect.objectContaining({ familyId: FAMILY_ID }),
        }),
      );
      expect(result).toEqual([mockEvent]);
    });

    it('applies date range filter when start and end provided', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);
      prismaMock.calendarEvent.findMany.mockResolvedValue([]);

      await service.listEvents(FAMILY_ID, USER_ID, '2026-05-01', '2026-05-31');

      expect(prismaMock.calendarEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            familyId: FAMILY_ID,
          }),
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
      prismaMock.calendarEvent.findFirst.mockResolvedValue(mockEvent);
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
      prismaMock.calendarEvent.findFirst.mockResolvedValue(null);

      await expect(
        service.updateEvent(FAMILY_ID, 'nonexistent', USER_ID, { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteEvent', () => {
    it('deletes an event', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);
      prismaMock.calendarEvent.findFirst.mockResolvedValue(mockEvent);
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
      prismaMock.calendarEvent.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteEvent(FAMILY_ID, 'nonexistent', USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('adds instanceDate to exceptions instead of deleting when instanceDate is provided', async () => {
      const recurringEvent = {
        ...mockEvent,
        recurrence: { freq: 'weekly', exceptions: [] },
      };
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);
      prismaMock.calendarEvent.findFirst.mockResolvedValue(recurringEvent);
      prismaMock.calendarEvent.update.mockResolvedValue(recurringEvent);

      await service.deleteEvent(FAMILY_ID, EVENT_ID, USER_ID, '2026-05-08');

      expect(prismaMock.calendarEvent.delete).not.toHaveBeenCalled();
      expect(prismaMock.calendarEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: EVENT_ID },
          data: expect.objectContaining({
            recurrence: expect.objectContaining({
              exceptions: expect.arrayContaining(['2026-05-08']),
            }),
          }),
        }),
      );
    });
  });

  describe('listEvents — recurring expansion', () => {
    it('expands a weekly recurring event into multiple instances within the range', async () => {
      const recurringEvent = {
        ...mockEvent,
        startAt: new Date('2026-05-01T10:00:00Z'),
        endAt: new Date('2026-05-01T11:00:00Z'),
        recurrence: { freq: 'weekly' },
      };
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);
      prismaMock.calendarEvent.findMany.mockResolvedValue([recurringEvent]);

      const result = await service.listEvents(
        FAMILY_ID,
        USER_ID,
        '2026-05-01',
        '2026-05-31',
      );

      // Should include at least the first instance (2026-05-01) and the next (2026-05-08)
      expect(result.length).toBeGreaterThan(1);
      const startDates = result.map((ev) => (ev as { startAt: string }).startAt);
      expect(startDates.some((d) => d.startsWith('2026-05-01'))).toBe(true);
      expect(startDates.some((d) => d.startsWith('2026-05-08'))).toBe(true);
    });

    it('respects exceptions — skips dates in the exceptions array', async () => {
      const recurringEvent = {
        ...mockEvent,
        startAt: new Date('2026-05-01T10:00:00Z'),
        endAt: new Date('2026-05-01T11:00:00Z'),
        recurrence: { freq: 'weekly', exceptions: ['2026-05-08'] },
      };
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);
      prismaMock.calendarEvent.findMany.mockResolvedValue([recurringEvent]);

      const result = await service.listEvents(
        FAMILY_ID,
        USER_ID,
        '2026-05-01',
        '2026-05-31',
      );

      const startDates = result.map((ev) => (ev as { startAt: string }).startAt);
      expect(startDates.some((d) => d.startsWith('2026-05-08'))).toBe(false);
    });
  });

  describe('updateEvent — editMode', () => {
    it('editMode "this" creates an override event and adds instanceDate to base exceptions', async () => {
      const recurringEvent = {
        ...mockEvent,
        startAt: new Date('2026-05-01T10:00:00Z'),
        endAt: new Date('2026-05-01T11:00:00Z'),
        recurrence: { freq: 'weekly', exceptions: [] },
      };
      const overrideEvent = {
        ...mockEvent,
        id: 'override-event-1',
        title: 'Override Title',
      };
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);
      prismaMock.calendarEvent.findFirst.mockResolvedValue(recurringEvent);
      prismaMock.calendarEvent.update.mockResolvedValue(recurringEvent);
      prismaMock.calendarEvent.create.mockResolvedValue(overrideEvent);

      const result = await service.updateEvent(
        FAMILY_ID,
        EVENT_ID,
        USER_ID,
        {
          title: 'Override Title',
          instanceDate: '2026-05-08',
          editMode: 'this',
        },
      );

      // Should add instanceDate to exceptions on base event
      expect(prismaMock.calendarEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: EVENT_ID },
          data: expect.objectContaining({
            recurrence: expect.objectContaining({
              exceptions: expect.arrayContaining(['2026-05-08']),
            }),
          }),
        }),
      );
      // Should create a new standalone override event
      expect(prismaMock.calendarEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            familyId: FAMILY_ID,
            title: 'Override Title',
          }),
        }),
      );
      expect(result).toEqual(overrideEvent);
    });

    it('editMode "all" updates base event fields directly', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(mockMember);
      prismaMock.calendarEvent.findFirst.mockResolvedValue(mockEvent);
      const updated = { ...mockEvent, title: 'All Updated' };
      prismaMock.calendarEvent.update.mockResolvedValue(updated);

      const result = await service.updateEvent(
        FAMILY_ID,
        EVENT_ID,
        USER_ID,
        {
          title: 'All Updated',
          editMode: 'all',
        },
      );

      expect(prismaMock.calendarEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: EVENT_ID },
          data: expect.objectContaining({ title: 'All Updated' }),
        }),
      );
      expect(result).toEqual(updated);
    });
  });
});
