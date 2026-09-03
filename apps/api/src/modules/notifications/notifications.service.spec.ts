import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../database/prisma.service';
import { PushService } from '../push/push.service';
import { NOTIFICATION_CHANNELS } from './channels/notification-channel.interface';

const mockPrisma = {
  family: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  familyMember: { findMany: jest.fn(), findUnique: jest.fn() },
  notificationLog: { create: jest.fn() },
};

const mockPush = {
  sendToUser: jest.fn(),
  sendToUsers: jest.fn(),
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NOTIFICATION_CHANNELS, useValue: [] },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PushService, useValue: mockPush },
      ],
    }).compile();

    service = module.get(NotificationsService);
    jest.clearAllMocks();
  });

  describe('sendFamilyActivityNotification', () => {
    it('pushes to other members and skips the actor', async () => {
      mockPrisma.family.findUnique.mockResolvedValue({
        name: 'Smith',
        emoji: '🏠',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Matias' });
      mockPrisma.familyMember.findMany.mockResolvedValue([
        { userId: 'actor', notificationSettings: {}, user: { locale: 'en' } },
        { userId: 'dana', notificationSettings: {}, user: { locale: 'en' } },
        {
          userId: 'quiet',
          notificationSettings: { itemAdded: false },
          user: { locale: 'en' },
        },
      ]);

      await service.sendFamilyActivityNotification({
        familyId: 'family-1',
        actorUserId: 'actor',
        activity: {
          type: 'list_item',
          itemText: 'Milk',
          pageTitle: 'Groceries',
        },
        url: '/family/family-1/pages/p1',
      });

      expect(mockPush.sendToUsers).toHaveBeenCalledWith(
        ['dana'],
        expect.objectContaining({
          title: '🏠 Smith',
          body: 'Matias added "Milk" to Groceries',
          url: '/family/family-1/pages/p1',
        }),
      );
    });

    it('also skips an assignee so they only get the assignment push', async () => {
      mockPrisma.family.findUnique.mockResolvedValue({
        name: 'Smith',
        emoji: '🏠',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Matias' });
      mockPrisma.familyMember.findMany.mockResolvedValue([
        { userId: 'actor', notificationSettings: {}, user: { locale: 'en' } },
        { userId: 'dana', notificationSettings: {}, user: { locale: 'en' } },
        { userId: 'lee', notificationSettings: {}, user: { locale: 'en' } },
      ]);

      await service.sendFamilyActivityNotification({
        familyId: 'family-1',
        actorUserId: 'actor',
        excludeUserIds: ['dana'],
        activity: {
          type: 'list_item',
          itemText: 'Milk',
          pageTitle: 'Groceries',
        },
        url: '/family/family-1/pages/p1',
      });

      expect(mockPush.sendToUsers).toHaveBeenCalledWith(
        ['lee'],
        expect.objectContaining({
          body: 'Matias added "Milk" to Groceries',
        }),
      );
    });

    it('sends Hebrew copy to members whose locale is he', async () => {
      mockPrisma.family.findUnique.mockResolvedValue({
        name: 'Smith',
        emoji: '🏠',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Matias' });
      mockPrisma.familyMember.findMany.mockResolvedValue([
        { userId: 'actor', notificationSettings: {}, user: { locale: 'en' } },
        { userId: 'dana', notificationSettings: {}, user: { locale: 'he' } },
      ]);

      await service.sendFamilyActivityNotification({
        familyId: 'family-1',
        actorUserId: 'actor',
        activity: {
          type: 'list_item',
          itemText: 'Milk',
          pageTitle: 'Groceries',
        },
        url: '/family/family-1/pages/p1',
      });

      expect(mockPush.sendToUsers).toHaveBeenCalledWith(
        ['dana'],
        expect.objectContaining({
          body: 'Matias הוסיף "Milk" לGroceries',
        }),
      );
    });
  });

  describe('sendEventReminderNotification', () => {
    it('uses Hebrew reminder copy and calendar deep link', async () => {
      const startAt = new Date('2026-09-03T18:00:00.000Z');
      mockPrisma.familyMember.findMany.mockResolvedValue([
        {
          userId: 'dana',
          notificationSettings: {},
          whatsappPhone: null,
          user: { locale: 'he' },
        },
      ]);

      await service.sendEventReminderNotification(
        'family-1',
        'event-1',
        'Dinner',
        startAt,
        'Smith',
        '🏠',
      );

      expect(mockPush.sendToUsers).toHaveBeenCalledWith(
        ['dana'],
        expect.objectContaining({
          body: expect.stringContaining('תזכורת: Dinner'),
          url: '/family/family-1/calendar?event=event-1',
        }),
      );
    });
  });
});
