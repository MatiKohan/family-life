import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { SearchService } from './search.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrisma = {
  familyMember: {
    findUnique: jest.fn(),
  },
  page: {
    findMany: jest.fn(),
  },
  calendarEvent: {
    findMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    jest.clearAllMocks();
  });

  it('should throw ForbiddenException when user is not a family member', async () => {
    mockPrisma.familyMember.findUnique.mockResolvedValue(null);

    await expect(service.search('family-1', 'user-1', 'hello')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should return grouped search results', async () => {
    mockPrisma.familyMember.findUnique.mockResolvedValue({ id: 'member-1' });

    const mockPages = [
      { id: 'page-1', title: 'Shopping list', emoji: '🛒', type: 'list' },
    ];
    const mockItemPages: {
      id: string;
      title: string;
      emoji: string;
      items: string;
    }[] = [
      {
        id: 'page-2',
        title: 'Groceries',
        emoji: '🍎',
        items: JSON.stringify([
          {
            type: 'list',
            items: [{ id: 'i-1', text: 'Buy milk' }],
          },
        ]),
      },
    ];
    const mockTaskPages: {
      id: string;
      title: string;
      emoji: string;
      task_items: string;
    }[] = [
      {
        id: 'page-3',
        title: 'Chores',
        emoji: '🧹',
        task_items: JSON.stringify([{ id: 't-1', text: 'Clean bathroom' }]),
      },
    ];
    const mockEvents = [
      {
        id: 'evt-1',
        title: 'Doctor appointment',
        startAt: new Date('2026-05-01T10:00:00Z'),
        familyId: 'family-1',
      },
    ];

    mockPrisma.page.findMany.mockResolvedValue(mockPages);
    mockPrisma.$queryRaw
      .mockResolvedValueOnce(mockItemPages)
      .mockResolvedValueOnce(mockTaskPages);
    mockPrisma.calendarEvent.findMany.mockResolvedValue(mockEvents);

    const result = await service.search('family-1', 'user-1', 'milk');

    expect(result.pages).toEqual(mockPages);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      text: 'Buy milk',
      pageId: 'page-2',
      pageTitle: 'Groceries',
      pageEmoji: '🍎',
    });
    expect(result.tasks).toHaveLength(0); // 'clean bathroom' does not contain 'milk'
    expect(result.events).toHaveLength(1);
    expect(result.events[0].startAt).toBe('2026-05-01T10:00:00.000Z');
  });

  it('should return matching tasks', async () => {
    mockPrisma.familyMember.findUnique.mockResolvedValue({ id: 'member-1' });

    mockPrisma.page.findMany.mockResolvedValue([]);
    mockPrisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'page-3',
        title: 'Chores',
        emoji: '🧹',
        task_items: JSON.stringify([
          { id: 't-1', text: 'Clean bathroom' },
          { id: 't-2', text: 'Clean kitchen' },
        ]),
      },
    ]);
    mockPrisma.calendarEvent.findMany.mockResolvedValue([]);

    const result = await service.search('family-1', 'user-1', 'clean');

    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].text).toBe('Clean bathroom');
    expect(result.tasks[1].text).toBe('Clean kitchen');
  });

  it('should cap results at 10 items/tasks each', async () => {
    mockPrisma.familyMember.findUnique.mockResolvedValue({ id: 'member-1' });

    const manyItems = Array.from({ length: 20 }, (_, i) => ({
      id: `i-${i}`,
      text: `test item ${i}`,
    }));
    mockPrisma.page.findMany.mockResolvedValue([]);
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 'page-1',
          title: 'Big list',
          emoji: '📝',
          items: JSON.stringify([{ type: 'list', items: manyItems }]),
        },
      ])
      .mockResolvedValueOnce([]);
    mockPrisma.calendarEvent.findMany.mockResolvedValue([]);

    const result = await service.search('family-1', 'user-1', 'test');
    expect(result.items).toHaveLength(10);
  });

  it('should skip pages with unparseable JSONB gracefully', async () => {
    mockPrisma.familyMember.findUnique.mockResolvedValue({ id: 'member-1' });

    mockPrisma.page.findMany.mockResolvedValue([]);
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([
        { id: 'page-1', title: 'Bad', emoji: '❌', items: 'not-json' },
      ])
      .mockResolvedValueOnce([
        { id: 'page-2', title: 'Bad', emoji: '❌', task_items: 'not-json' },
      ]);
    mockPrisma.calendarEvent.findMany.mockResolvedValue([]);

    await expect(service.search('family-1', 'user-1', 'test')).resolves.toEqual(
      {
        pages: [],
        items: [],
        tasks: [],
        events: [],
      },
    );
  });
});
