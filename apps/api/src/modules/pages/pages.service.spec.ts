import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PagesService } from './pages.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';

const FAMILY_ID = 'family-1';
const USER_ID = 'user-1';
const PAGE_ID = 'page-1';
const ITEM_ID = 'item-1';

const mockMember = { id: 'member-1', familyId: FAMILY_ID, userId: USER_ID };

function makeListPage(overrides: Record<string, unknown> = {}) {
  return {
    id: PAGE_ID,
    familyId: FAMILY_ID,
    title: 'My List',
    emoji: '📄',
    type: 'list',
    items: [] as {
      id: string;
      text: string;
      checked: boolean;
      assigneeId: string | null;
      dueDate: string | null;
      createdAt: string;
    }[],
    taskItems: [] as {
      id: string;
      text: string;
      assigneeId: string | null;
      status: string;
      dueDate: string | null;
      createdAt: string;
    }[],
    eventIds: [] as string[],
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const mockPrisma = {
  familyMember: {
    findUnique: jest.fn(),
  },
  page: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
    updateMany: jest.fn(),
  },
  calendarEvent: {
    findMany: jest.fn(),
  },
};

describe('PagesService', () => {
  let service: PagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagesService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: NotificationsService,
          useValue: { sendAssignmentNotification: jest.fn() },
        },
        { provide: ActivityService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<PagesService>(PagesService);
    jest.clearAllMocks();
  });

  // --- listPages ---

  describe('listPages', () => {
    it('returns pages for a family member', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const pages = [
        { id: PAGE_ID, title: 'My List', emoji: '📄', type: 'list' },
      ];
      mockPrisma.page.findMany.mockResolvedValue(pages);

      const result = await service.listPages(FAMILY_ID, USER_ID);

      expect(mockPrisma.familyMember.findUnique).toHaveBeenCalledWith({
        where: { familyId_userId: { familyId: FAMILY_ID, userId: USER_ID } },
      });
      expect(mockPrisma.page.findMany).toHaveBeenCalledWith({
        where: { familyId: FAMILY_ID, deletedAt: null },
        select: {
          id: true,
          title: true,
          emoji: true,
          type: true,
          sortOrder: true,
          folderId: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });
      expect(result).toEqual(pages);
    });

    it('throws ForbiddenException if user is not a member', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(service.listPages(FAMILY_ID, USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // --- createPage ---

  describe('createPage', () => {
    it('creates and returns a page when user is a member', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      mockPrisma.page.aggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
      const createdPage = makeListPage({ title: 'Shopping' });
      mockPrisma.page.create.mockResolvedValue(createdPage);

      const result = await service.createPage(FAMILY_ID, USER_ID, {
        title: 'Shopping',
        type: 'list',
      });

      expect(mockPrisma.page.create).toHaveBeenCalledWith({
        data: {
          familyId: FAMILY_ID,
          title: 'Shopping',
          emoji: '📄',
          type: 'list',
          createdBy: USER_ID,
          sortOrder: 1,
        },
      });
      expect(result).toEqual(createdPage);
    });

    it('throws ForbiddenException if user is not a member', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.createPage(FAMILY_ID, USER_ID, {
          title: 'Shopping',
          type: 'list',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // --- getPage ---

  describe('getPage', () => {
    it('returns a page when found and user is member', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const mockPage = makeListPage();
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);

      const result = await service.getPage(FAMILY_ID, PAGE_ID, USER_ID);
      // blocks is added for list pages — verify core fields match
      expect(result).toMatchObject({
        id: mockPage.id,
        familyId: mockPage.familyId,
        title: mockPage.title,
        type: mockPage.type,
        items: mockPage.items,
        taskItems: mockPage.taskItems,
      });
      // blocks should be present for list pages
      expect((result as { blocks?: unknown }).blocks).toBeDefined();
    });

    it('throws NotFoundException when page does not exist', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await expect(
        service.getPage(FAMILY_ID, PAGE_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('attaches events for an events-type page', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const eventsPage = makeListPage({
        type: 'events',
        eventIds: ['event-1'],
      });
      mockPrisma.page.findFirst.mockResolvedValue(eventsPage);
      const events = [{ id: 'event-1', title: 'Birthday' }];
      mockPrisma.calendarEvent.findMany.mockResolvedValue(events);

      const result = (await service.getPage(
        FAMILY_ID,
        PAGE_ID,
        USER_ID,
      )) as unknown as typeof eventsPage & { events: unknown[] };
      expect(result.events).toEqual(events);
    });
  });

  // --- updatePage ---

  describe('updatePage', () => {
    it('updates title and emoji', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const page = makeListPage();
      const updatedPage = { ...page, title: 'New Title', emoji: '🛒' };
      mockPrisma.page.findFirst.mockResolvedValue(page);
      mockPrisma.page.update.mockResolvedValue(updatedPage);

      const result = await service.updatePage(FAMILY_ID, PAGE_ID, USER_ID, {
        title: 'New Title',
        emoji: '🛒',
      });

      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: PAGE_ID },
        data: { title: 'New Title', emoji: '🛒' },
      });
      expect(result).toEqual(updatedPage);
    });

    it('throws NotFoundException when page does not exist', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePage(FAMILY_ID, PAGE_ID, USER_ID, { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --- deletePage ---

  describe('deletePage', () => {
    it('soft-deletes the page when it exists and user is member', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const page = makeListPage();
      mockPrisma.page.findFirst.mockResolvedValue(page);
      mockPrisma.page.update.mockResolvedValue({
        ...page,
        deletedAt: new Date(),
      });

      await service.deletePage(FAMILY_ID, PAGE_ID, USER_ID);
      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: PAGE_ID },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('throws NotFoundException when page does not exist', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await expect(
        service.deletePage(FAMILY_ID, PAGE_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --- addItem ---

  describe('addItem', () => {
    it('adds an item to a list-type page', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const page = makeListPage();
      mockPrisma.page.findFirst.mockResolvedValue(page);
      const updatedPage = {
        ...page,
        items: [
          {
            id: 'uuid',
            text: 'Buy milk',
            checked: false,
            assigneeId: null,
            dueDate: null,
            createdAt: '',
          },
        ],
      };
      mockPrisma.page.update.mockResolvedValue(updatedPage);

      const result = await service.addItem(FAMILY_ID, PAGE_ID, USER_ID, {
        text: 'Buy milk',
      });

      expect(mockPrisma.page.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PAGE_ID },
          data: expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({ text: 'Buy milk', checked: false }),
            ]),
          }),
        }),
      );
      expect(result).toEqual(updatedPage);
    });

    it('throws BadRequestException for non-list pages', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const eventsPage = makeListPage({ type: 'events' });
      mockPrisma.page.findFirst.mockResolvedValue(eventsPage);

      await expect(
        service.addItem(FAMILY_ID, PAGE_ID, USER_ID, { text: 'Buy milk' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when page does not exist', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await expect(
        service.addItem(FAMILY_ID, PAGE_ID, USER_ID, { text: 'Buy milk' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if user is not a member', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem(FAMILY_ID, PAGE_ID, USER_ID, { text: 'Buy milk' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // --- updateItem ---

  describe('updateItem', () => {
    it('updates matching item', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const item = {
        id: ITEM_ID,
        text: 'Old text',
        checked: false,
        assigneeId: null,
        dueDate: null,
        createdAt: '',
      };
      const page = makeListPage({ items: [item] });
      mockPrisma.page.findFirst.mockResolvedValue(page);
      const updatedPage = {
        ...page,
        items: [{ ...item, text: 'New text', checked: true }],
      };
      mockPrisma.page.update.mockResolvedValue(updatedPage);

      const result = await service.updateItem(
        FAMILY_ID,
        PAGE_ID,
        ITEM_ID,
        USER_ID,
        {
          text: 'New text',
          checked: true,
        },
      );

      expect(mockPrisma.page.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PAGE_ID },
          data: expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({
                id: ITEM_ID,
                text: 'New text',
                checked: true,
              }),
            ]),
          }),
        }),
      );
      expect(result).toEqual(updatedPage);
    });

    it('throws ForbiddenException if user is not a member', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.updateItem(FAMILY_ID, PAGE_ID, ITEM_ID, USER_ID, {
          checked: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // --- deleteItem ---

  describe('deleteItem', () => {
    it('soft-deletes item by setting deletedAt', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const item = {
        id: ITEM_ID,
        text: 'Buy milk',
        checked: false,
        assigneeId: null,
        dueDate: null,
        createdAt: '',
      };
      const page = makeListPage({ items: [item] });
      mockPrisma.page.findFirst.mockResolvedValue(page);
      mockPrisma.page.update.mockResolvedValue(page);

      await service.deleteItem(FAMILY_ID, PAGE_ID, ITEM_ID, USER_ID);

      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: PAGE_ID },
        data: {
          items: [
            expect.objectContaining({
              id: ITEM_ID,
              deletedAt: expect.any(String),
            }),
          ],
        },
      });
    });

    it('throws NotFoundException when page does not exist', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteItem(FAMILY_ID, PAGE_ID, ITEM_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --- addTaskItem ---

  describe('addTaskItem', () => {
    it('adds a task item to a tasks-type page', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const page = makeListPage({ type: 'tasks' });
      mockPrisma.page.findFirst.mockResolvedValue(page);
      const updatedPage = {
        ...page,
        taskItems: [
          {
            id: 'uuid',
            text: 'Fix the roof',
            assigneeId: null,
            status: 'todo',
            dueDate: null,
            createdAt: '',
          },
        ],
      };
      mockPrisma.page.update.mockResolvedValue(updatedPage);

      const result = await service.addTaskItem(FAMILY_ID, PAGE_ID, USER_ID, {
        text: 'Fix the roof',
      });

      expect(mockPrisma.page.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PAGE_ID },
          data: expect.objectContaining({
            taskItems: expect.arrayContaining([
              expect.objectContaining({
                text: 'Fix the roof',
                status: 'todo',
                assigneeId: null,
              }),
            ]),
          }),
        }),
      );
      expect(result).toEqual(updatedPage);
    });

    it('throws BadRequestException for non-tasks pages', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const listPage = makeListPage({ type: 'list' });
      mockPrisma.page.findFirst.mockResolvedValue(listPage);

      await expect(
        service.addTaskItem(FAMILY_ID, PAGE_ID, USER_ID, {
          text: 'Fix the roof',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // --- updateTaskItem ---

  describe('updateTaskItem', () => {
    it('updates status on an existing task item', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const taskItem = {
        id: ITEM_ID,
        text: 'Fix the roof',
        assigneeId: null,
        status: 'todo',
        dueDate: null,
        createdAt: '',
      };
      const page = makeListPage({ type: 'tasks', taskItems: [taskItem] });
      mockPrisma.page.findFirst.mockResolvedValue(page);
      const updatedPage = {
        ...page,
        taskItems: [{ ...taskItem, status: 'in-progress' }],
      };
      mockPrisma.page.update.mockResolvedValue(updatedPage);

      const result = await service.updateTaskItem(
        FAMILY_ID,
        PAGE_ID,
        ITEM_ID,
        USER_ID,
        {
          status: 'in-progress',
        },
      );

      expect(mockPrisma.page.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PAGE_ID },
          data: expect.objectContaining({
            taskItems: expect.arrayContaining([
              expect.objectContaining({ id: ITEM_ID, status: 'in-progress' }),
            ]),
          }),
        }),
      );
      expect(result).toEqual(updatedPage);
    });
  });

  // --- deleteTaskItem ---

  describe('deleteTaskItem', () => {
    it('soft-deletes task item by setting deletedAt', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const taskItem = {
        id: ITEM_ID,
        text: 'Fix the roof',
        assigneeId: null,
        status: 'todo',
        dueDate: null,
        createdAt: '',
      };
      const page = makeListPage({ type: 'tasks', taskItems: [taskItem] });
      mockPrisma.page.findFirst.mockResolvedValue(page);
      mockPrisma.page.update.mockResolvedValue(page);

      await service.deleteTaskItem(FAMILY_ID, PAGE_ID, ITEM_ID, USER_ID);

      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: PAGE_ID },
        data: {
          taskItems: [
            expect.objectContaining({
              id: ITEM_ID,
              deletedAt: expect.any(String),
            }),
          ],
        },
      });
    });
  });

  // --- addEventRef ---

  describe('addEventRef', () => {
    it('adds an eventId to the page', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const page = makeListPage({ type: 'events', eventIds: [] });
      mockPrisma.page.findFirst.mockResolvedValue(page);
      const updatedPage = { ...page, eventIds: ['event-1'] };
      mockPrisma.page.update.mockResolvedValue(updatedPage);

      const result = await service.addEventRef(
        FAMILY_ID,
        PAGE_ID,
        USER_ID,
        'event-1',
      );

      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: PAGE_ID },
        data: { eventIds: ['event-1'] },
      });
      expect(result).toEqual(updatedPage);
    });

    it('does not duplicate an existing eventId', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const page = makeListPage({ type: 'events', eventIds: ['event-1'] });
      mockPrisma.page.findFirst.mockResolvedValue(page);

      const result = await service.addEventRef(
        FAMILY_ID,
        PAGE_ID,
        USER_ID,
        'event-1',
      );

      expect(mockPrisma.page.update).not.toHaveBeenCalled();
      expect(result).toEqual(page);
    });
  });

  // --- removeEventRef ---

  describe('removeEventRef', () => {
    it('removes an eventId from the page', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const page = makeListPage({
        type: 'events',
        eventIds: ['event-1', 'event-2'],
      });
      mockPrisma.page.findFirst.mockResolvedValue(page);
      const updatedPage = { ...page, eventIds: ['event-2'] };
      mockPrisma.page.update.mockResolvedValue(updatedPage);

      await service.removeEventRef(FAMILY_ID, PAGE_ID, USER_ID, 'event-1');

      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: PAGE_ID },
        data: { eventIds: ['event-2'] },
      });
    });
  });
});
