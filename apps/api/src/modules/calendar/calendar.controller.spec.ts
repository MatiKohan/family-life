import { Test, TestingModule } from '@nestjs/testing';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { IcsService } from './ics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '@family-life/types';

const FAMILY_ID = 'family-1';
const EVENT_ID = 'event-1';
const USER_ID = 'user-1';

const mockUser: AuthUser = {
  id: USER_ID,
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: null,
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

const mockCalendarService = {
  listEvents: jest.fn(),
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
};

const mockIcsService = {
  getOrCreateToken: jest.fn(),
  regenerateToken: jest.fn(),
  generateIcs: jest.fn(),
};

describe('CalendarController', () => {
  let controller: CalendarController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarController],
      providers: [
        { provide: CalendarService, useValue: mockCalendarService },
        { provide: IcsService, useValue: mockIcsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CalendarController>(CalendarController);
    jest.clearAllMocks();
  });

  describe('listEvents', () => {
    it('calls calendarService.listEvents with correct params and returns result', async () => {
      const events = [mockEvent];
      mockCalendarService.listEvents.mockResolvedValue(events);

      const result = await controller.listEvents(
        mockUser,
        FAMILY_ID,
        '2026-05-01',
        '2026-05-31',
      );

      expect(mockCalendarService.listEvents).toHaveBeenCalledWith(
        FAMILY_ID,
        USER_ID,
        '2026-05-01',
        '2026-05-31',
      );
      expect(result).toEqual(events);
    });

    it('calls calendarService.listEvents without date params when not provided', async () => {
      mockCalendarService.listEvents.mockResolvedValue([]);

      await controller.listEvents(mockUser, FAMILY_ID);

      expect(mockCalendarService.listEvents).toHaveBeenCalledWith(
        FAMILY_ID,
        USER_ID,
        undefined,
        undefined,
      );
    });
  });

  describe('createEvent', () => {
    it('calls calendarService.createEvent and returns the created event', async () => {
      mockCalendarService.createEvent.mockResolvedValue(mockEvent);
      const dto = {
        title: 'Birthday Party',
        startAt: '2026-05-01T10:00:00Z',
        endAt: '2026-05-01T12:00:00Z',
      };

      const result = await controller.createEvent(mockUser, FAMILY_ID, dto);

      expect(mockCalendarService.createEvent).toHaveBeenCalledWith(
        FAMILY_ID,
        USER_ID,
        dto,
      );
      expect(result).toEqual(mockEvent);
    });
  });

  describe('updateEvent', () => {
    it('calls calendarService.updateEvent with correct params and returns result', async () => {
      const updated = { ...mockEvent, title: 'Updated Title' };
      mockCalendarService.updateEvent.mockResolvedValue(updated);
      const dto = { title: 'Updated Title' };

      const result = await controller.updateEvent(
        mockUser,
        FAMILY_ID,
        EVENT_ID,
        dto,
      );

      expect(mockCalendarService.updateEvent).toHaveBeenCalledWith(
        FAMILY_ID,
        EVENT_ID,
        USER_ID,
        dto,
      );
      expect(result).toEqual(updated);
    });
  });

  describe('deleteEvent', () => {
    it('calls calendarService.deleteEvent with correct params', async () => {
      mockCalendarService.deleteEvent.mockResolvedValue(undefined);

      await controller.deleteEvent(mockUser, FAMILY_ID, EVENT_ID);

      expect(mockCalendarService.deleteEvent).toHaveBeenCalledWith(
        FAMILY_ID,
        EVENT_ID,
        USER_ID,
        undefined,
      );
    });

    it('passes the instance query param to calendarService.deleteEvent', async () => {
      mockCalendarService.deleteEvent.mockResolvedValue(undefined);

      await controller.deleteEvent(mockUser, FAMILY_ID, EVENT_ID, '2026-05-08');

      expect(mockCalendarService.deleteEvent).toHaveBeenCalledWith(
        FAMILY_ID,
        EVENT_ID,
        USER_ID,
        '2026-05-08',
      );
    });
  });
});
