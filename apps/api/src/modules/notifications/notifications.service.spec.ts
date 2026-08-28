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
        { userId: 'actor', notificationSettings: {} },
        { userId: 'dana', notificationSettings: {} },
        { userId: 'quiet', notificationSettings: { itemAdded: false } },
      ]);

      await service.sendFamilyActivityNotification({
        familyId: 'family-1',
        actorUserId: 'actor',
        message: 'added "Milk" to Groceries',
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
        { userId: 'actor', notificationSettings: {} },
        { userId: 'dana', notificationSettings: {} },
        { userId: 'lee', notificationSettings: {} },
      ]);

      await service.sendFamilyActivityNotification({
        familyId: 'family-1',
        actorUserId: 'actor',
        excludeUserIds: ['dana'],
        message: 'added "Milk" to Groceries',
        url: '/family/family-1/pages/p1',
      });

      expect(mockPush.sendToUsers).toHaveBeenCalledWith(
        ['lee'],
        expect.objectContaining({
          body: 'Matias added "Milk" to Groceries',
        }),
      );
    });
  });
});
