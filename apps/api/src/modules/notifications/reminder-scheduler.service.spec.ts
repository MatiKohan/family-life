import { Test, TestingModule } from '@nestjs/testing';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from './notifications.service';

const FAMILY = { name: 'The Smiths', emoji: '🏠' };

describe('ReminderSchedulerService', () => {
  let service: ReminderSchedulerService;
  const prismaMock = {
    calendarEvent: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const notifications = {
    sendEventReminderNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderSchedulerService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = module.get(ReminderSchedulerService);
    jest.clearAllMocks();
    prismaMock.calendarEvent.update.mockResolvedValue({});
    notifications.sendEventReminderNotification.mockResolvedValue(undefined);
  });

  it('sends a one-off reminder once and sets reminderSentAt', async () => {
    const startAt = new Date(Date.now() + 15 * 60_000);
    prismaMock.calendarEvent.findMany.mockResolvedValue([
      {
        id: 'e1',
        familyId: 'f1',
        title: 'Dentist',
        startAt,
        endAt: new Date(startAt.getTime() + 60_000),
        reminderMinutesBefore: 15,
        reminderSentAt: null,
        reminderSentDates: [],
        recurrence: null,
        family: FAMILY,
      },
    ]);

    await service.sendDueReminders();

    expect(notifications.sendEventReminderNotification).toHaveBeenCalledTimes(1);
    expect(prismaMock.calendarEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'e1' },
        data: expect.objectContaining({ reminderSentAt: expect.any(Date) }),
      }),
    );
  });

  it('does not resend a one-off reminder after reminderSentAt', async () => {
    const startAt = new Date(Date.now() + 15 * 60_000);
    prismaMock.calendarEvent.findMany.mockResolvedValue([
      {
        id: 'e1',
        familyId: 'f1',
        title: 'Dentist',
        startAt,
        reminderMinutesBefore: 15,
        reminderSentAt: new Date(),
        reminderSentDates: [],
        recurrence: null,
        family: FAMILY,
      },
    ]);

    await service.sendDueReminders();

    expect(notifications.sendEventReminderNotification).not.toHaveBeenCalled();
  });

  it('sends a later recurring instance after the first was already reminded', async () => {
    const startAt = new Date(Date.now() + 15 * 60_000);
    const firstDate = new Date(startAt.getTime() - 7 * 24 * 60 * 60_000)
      .toISOString()
      .slice(0, 10);
    prismaMock.calendarEvent.findMany.mockResolvedValue([
      {
        id: 'e2',
        familyId: 'f1',
        title: 'Standup',
        startAt,
        endAt: new Date(startAt.getTime() + 60_000),
        reminderMinutesBefore: 15,
        reminderSentAt: new Date(),
        reminderSentDates: [firstDate],
        recurrence: { freq: 'weekly' },
        family: FAMILY,
      },
    ]);

    await service.sendDueReminders();

    expect(notifications.sendEventReminderNotification).toHaveBeenCalledTimes(1);
    expect(prismaMock.calendarEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'e2' },
        data: expect.objectContaining({
          reminderSentDates: expect.arrayContaining([
            startAt.toISOString().slice(0, 10),
          ]),
        }),
      }),
    );
  });
});
