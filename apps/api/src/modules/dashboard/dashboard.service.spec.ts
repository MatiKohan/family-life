import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../database/prisma.service';
import { CalendarService } from '../calendar/calendar.service';

const USER_ID = 'user-1';
const FAMILY_ID = 'family-1';

describe('DashboardService', () => {
  let service: DashboardService;
  const prisma = {
    familyMember: { findUnique: jest.fn() },
    page: { findMany: jest.fn() },
  };
  const calendar = { listEvents: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: CalendarService, useValue: calendar },
      ],
    }).compile();
    service = module.get(DashboardService);
    jest.clearAllMocks();
  });

  it('throws if the user is not a member', async () => {
    prisma.familyMember.findUnique.mockResolvedValue(null);
    await expect(
      service.getDashboard(USER_ID, FAMILY_ID, '2026-08-29', '2026-08-30'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns today events, assigned items, and open grocery count', async () => {
    prisma.familyMember.findUnique.mockResolvedValue({ id: 'm1' });
    calendar.listEvents.mockResolvedValue([
      {
        id: 'e1',
        title: 'Dinner',
        assigneeId: USER_ID,
        startAt: '2026-08-29T18:00:00.000Z',
        endAt: '2026-08-29T20:00:00.000Z',
        isAllDay: false,
      },
    ]);
    prisma.page.findMany.mockResolvedValue([
      {
        id: 'page-empty',
        title: 'Notes',
        emoji: '📝',
        type: 'list',
        items: [{ type: 'list', items: [] }],
        taskItems: [],
      },
      {
        id: 'page-1',
        title: 'Groceries',
        emoji: '🛒',
        type: 'list',
        items: [
          {
            type: 'list',
            items: [
              { text: 'Milk', checked: false, assigneeId: USER_ID },
              { text: 'Eggs', checked: false, assigneeId: null },
              { text: 'Done', checked: true, assigneeId: USER_ID },
            ],
          },
        ],
        taskItems: [],
      },
      {
        id: 'page-2',
        title: 'Tasks',
        emoji: '✅',
        type: 'tasks',
        items: [],
        taskItems: [
          { text: 'Call dentist', status: 'todo', assigneeId: USER_ID },
          { text: 'Done task', status: 'done', assigneeId: USER_ID },
        ],
      },
    ]);

    const result = await service.getDashboard(
      USER_ID,
      FAMILY_ID,
      '2026-08-29T00:00:00.000Z',
      '2026-08-30T00:00:00.000Z',
    );

    expect(result.openListItems).toBe(2);
    expect(result.leftoverPageId).toBe('page-1');
    expect(result.assigned.listItems).toEqual([
      expect.objectContaining({ text: 'Milk', pageTitle: 'Groceries' }),
    ]);
    expect(result.assigned.tasks).toEqual([
      expect.objectContaining({ text: 'Call dentist', status: 'todo' }),
    ]);
    expect(result.assigned.events).toEqual([
      expect.objectContaining({ id: 'e1', assigneeId: USER_ID }),
    ]);
    expect(result.todayEvents).toHaveLength(1);
  });
});
