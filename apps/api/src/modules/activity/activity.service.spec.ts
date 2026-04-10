import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService } from './activity.service';
import { PrismaService } from '../../database/prisma.service';

const FAMILY_ID = 'family-1';
const USER_ID = 'user-1';

const prismaMock = {
  activityLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('ActivityService', () => {
  let service: ActivityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('creates an activity log entry', async () => {
      const created = {
        id: 'log-1',
        familyId: FAMILY_ID,
        userId: USER_ID,
        type: 'item_added',
        payload: { itemText: 'milk' },
        createdAt: new Date(),
      };
      prismaMock.activityLog.create.mockResolvedValue(created);

      const result = await service.log({
        familyId: FAMILY_ID,
        userId: USER_ID,
        type: 'item_added',
        payload: { itemText: 'milk' },
      });

      expect(prismaMock.activityLog.create).toHaveBeenCalledWith({
        data: {
          familyId: FAMILY_ID,
          userId: USER_ID,
          type: 'item_added',
          payload: { itemText: 'milk' },
        },
      });
      expect(result).toBe(created);
    });

    it('defaults payload to empty object when not provided', async () => {
      prismaMock.activityLog.create.mockResolvedValue({});

      await service.log({
        familyId: FAMILY_ID,
        userId: USER_ID,
        type: 'event_created',
      });

      expect(prismaMock.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ payload: {} }),
      });
    });
  });

  describe('getFeed', () => {
    it('returns items and null nextCursor when no more pages', async () => {
      const now = new Date();
      const logs = [
        {
          id: 'log-1',
          createdAt: now,
          user: { id: USER_ID, name: 'Alice', avatarUrl: null },
        },
        {
          id: 'log-2',
          createdAt: now,
          user: { id: USER_ID, name: 'Alice', avatarUrl: null },
        },
      ];
      prismaMock.activityLog.findMany.mockResolvedValue(logs);

      const result = await service.getFeed(FAMILY_ID, 20);

      expect(result.nextCursor).toBeNull();
      expect(result.items).toHaveLength(2);
      expect(result.items[0].createdAt).toBe(now.toISOString());
    });

    it('returns nextCursor when there are more items', async () => {
      const now = new Date();
      const logs = Array.from({ length: 21 }, (_, i) => ({
        id: `log-${i}`,
        createdAt: now,
        user: { id: USER_ID, name: 'Alice', avatarUrl: null },
      }));
      prismaMock.activityLog.findMany.mockResolvedValue(logs);

      const result = await service.getFeed(FAMILY_ID, 20);

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe('log-19');
    });

    it('passes cursor to prisma query', async () => {
      prismaMock.activityLog.findMany.mockResolvedValue([]);

      await service.getFeed(FAMILY_ID, 20, 'log-5');

      expect(prismaMock.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'log-5' },
          skip: 1,
        }),
      );
    });
  });
});
