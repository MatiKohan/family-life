import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { PagesService } from './pages.service';
import { Page } from './schemas/page.schema';
import { PrismaService } from '../../database/prisma.service';

const FAMILY_ID = 'family-1';
const USER_ID = 'user-1';
const PAGE_ID = 'page-1';
const ITEM_ID = 'item-1';

const mockMember = { id: 'member-1', familyId: FAMILY_ID, userId: USER_ID };

function makeMockPage(overrides: Record<string, unknown> = {}) {
  const page = {
    _id: PAGE_ID,
    familyId: FAMILY_ID,
    title: 'My List',
    emoji: '📄',
    type: 'list',
    items: [] as { id: string; text: string; checked: boolean; assigneeId: string | null; dueDate: Date | null; createdAt: Date }[],
    taskItems: [] as { id: string; text: string; assigneeId: string | null; status: string; dueDate: Date | null; createdAt: Date }[],
    eventIds: [] as string[],
    createdBy: USER_ID,
    save: jest.fn(),
    deleteOne: jest.fn(),
    ...overrides,
  };
  page.save.mockResolvedValue(page);
  page.deleteOne.mockResolvedValue(undefined);
  return page;
}

const mockPrisma = {
  familyMember: {
    findUnique: jest.fn(),
  },
};

describe('PagesService', () => {
  let service: PagesService;
  // We keep a reference to the mock model constructor/class
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pageModelMock: any;

  beforeEach(async () => {
    // Create a class that acts as the Mongoose model constructor.
    // save is defined on the prototype (not as an instance field) so tests
    // can override it via pageModelMock.prototype.save = jest.fn().
    class MockModel {
      static find = jest.fn();
      static findById = jest.fn();

      [key: string]: unknown;

      constructor(data: Record<string, unknown>) {
        Object.assign(this, data);
      }

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      save() {}
    }

    pageModelMock = MockModel;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagesService,
        { provide: getModelToken(Page.name), useValue: MockModel },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PagesService>(PagesService);
    jest.clearAllMocks();

    // Re-attach static mocks after clearAllMocks (they were on the constructor fn)
    pageModelMock.find = jest.fn();
    pageModelMock.findById = jest.fn();
  });

  // --- createPage ---

  describe('createPage', () => {
    it('creates and saves a page when user is a member', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);

      const createdPage = makeMockPage({ title: 'Shopping', type: 'list' });
      // MockModel.save is an instance property, so patch it on the prototype directly
      pageModelMock.prototype.save = jest.fn().mockResolvedValue(createdPage);

      const result = await service.createPage(FAMILY_ID, USER_ID, {
        title: 'Shopping',
        type: 'list',
      });

      expect(mockPrisma.familyMember.findUnique).toHaveBeenCalledWith({
        where: { familyId_userId: { familyId: FAMILY_ID, userId: USER_ID } },
      });
      expect(result).toEqual(createdPage);
    });

    it('throws ForbiddenException if user is not a member', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.createPage(FAMILY_ID, USER_ID, { title: 'Shopping', type: 'list' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // --- getPage ---

  describe('getPage', () => {
    it('returns a page when found and user is member', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const mockPage = makeMockPage();
      pageModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPage),
      });

      const result = await service.getPage(FAMILY_ID, PAGE_ID, USER_ID);
      expect(result).toEqual(mockPage);
    });

    it('throws NotFoundException when page does not exist', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      pageModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getPage(FAMILY_ID, PAGE_ID, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when page belongs to a different family', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const wrongFamilyPage = makeMockPage({ familyId: 'other-family' });
      pageModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(wrongFamilyPage),
      });

      await expect(service.getPage(FAMILY_ID, PAGE_ID, USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // --- addItem ---

  describe('addItem', () => {
    it('adds an item to a list-type page and saves', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const page = makeMockPage();
      pageModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(page),
      });

      const result = await service.addItem(FAMILY_ID, PAGE_ID, USER_ID, {
        text: 'Buy milk',
      });

      expect(page.items).toHaveLength(1);
      expect(page.items[0].text).toBe('Buy milk');
      expect(page.items[0].checked).toBe(false);
      expect(page.save).toHaveBeenCalled();
      expect(result).toEqual(page);
    });

    it('assigns optional fields when provided', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const page = makeMockPage();
      pageModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(page),
      });

      await service.addItem(FAMILY_ID, PAGE_ID, USER_ID, {
        text: 'Buy milk',
        assigneeId: 'user-2',
        dueDate: '2026-04-01',
      });

      expect(page.items[0].assigneeId).toBe('user-2');
      expect(page.items[0].dueDate).toBeInstanceOf(Date);
    });

    it('throws BadRequestException for events-type pages', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const eventsPage = makeMockPage({ type: 'events' });
      pageModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(eventsPage),
      });

      await expect(
        service.addItem(FAMILY_ID, PAGE_ID, USER_ID, { text: 'Buy milk' }),
      ).rejects.toThrow(BadRequestException);
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
    it('updates text and checked fields on an existing item', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const item = {
        id: ITEM_ID,
        text: 'Old text',
        checked: false,
        assigneeId: null,
        dueDate: null,
        createdAt: new Date(),
      };
      const page = makeMockPage({ items: [item] });
      pageModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(page),
      });

      const result = await service.updateItem(FAMILY_ID, PAGE_ID, ITEM_ID, USER_ID, {
        text: 'New text',
        checked: true,
      });

      expect(item.text).toBe('New text');
      expect(item.checked).toBe(true);
      expect(page.save).toHaveBeenCalled();
      expect(result).toEqual(page);
    });

    it('updates assigneeId to null when explicitly passed', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const item = {
        id: ITEM_ID,
        text: 'Task',
        checked: false,
        assigneeId: 'user-2',
        dueDate: null,
        createdAt: new Date(),
      };
      const page = makeMockPage({ items: [item] });
      pageModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(page),
      });

      await service.updateItem(FAMILY_ID, PAGE_ID, ITEM_ID, USER_ID, {
        assigneeId: null,
      });

      expect(item.assigneeId).toBeNull();
    });

    it('throws NotFoundException when item does not exist', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const page = makeMockPage({ items: [] });
      pageModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(page),
      });

      await expect(
        service.updateItem(FAMILY_ID, PAGE_ID, 'nonexistent', USER_ID, {
          text: 'x',
        }),
      ).rejects.toThrow(NotFoundException);
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

  // --- deletePage ---

  describe('deletePage', () => {
    it('calls deleteOne when page exists and user is member', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const page = makeMockPage();
      pageModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(page),
      });

      await service.deletePage(FAMILY_ID, PAGE_ID, USER_ID);
      expect(page.deleteOne).toHaveBeenCalled();
    });

    it('throws NotFoundException when page does not exist', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      pageModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.deletePage(FAMILY_ID, PAGE_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --- addTaskItem ---

  describe('addTaskItem', () => {
    it('adds a task item to a tasks-type page and saves', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const page = makeMockPage({ type: 'tasks' });
      pageModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(page),
      });

      const result = await service.addTaskItem(FAMILY_ID, PAGE_ID, USER_ID, {
        text: 'Fix the roof',
      });

      expect(page.taskItems).toHaveLength(1);
      expect(page.taskItems[0].text).toBe('Fix the roof');
      expect(page.taskItems[0].status).toBe('todo');
      expect(page.taskItems[0].assigneeId).toBeNull();
      expect(page.save).toHaveBeenCalled();
      expect(result).toEqual(page);
    });

    it('throws BadRequestException for non-tasks pages', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const listPage = makeMockPage({ type: 'list' });
      pageModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(listPage),
      });

      await expect(
        service.addTaskItem(FAMILY_ID, PAGE_ID, USER_ID, { text: 'Fix the roof' }),
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
        createdAt: new Date(),
      };
      const page = makeMockPage({ type: 'tasks', taskItems: [taskItem] });
      pageModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(page),
      });

      const result = await service.updateTaskItem(FAMILY_ID, PAGE_ID, ITEM_ID, USER_ID, {
        status: 'in-progress',
      });

      expect(taskItem.status).toBe('in-progress');
      expect(page.save).toHaveBeenCalled();
      expect(result).toEqual(page);
    });
  });

  // --- deleteItem ---

  describe('deleteItem', () => {
    it('removes the item from the page and saves', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const item = { id: ITEM_ID, text: 'Buy milk' };
      const page = makeMockPage({ items: [item] as unknown[] as typeof page.items });
      pageModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(page),
      });

      await service.deleteItem(FAMILY_ID, PAGE_ID, ITEM_ID, USER_ID);

      expect(page.items).toHaveLength(0);
      expect(page.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when item does not exist', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      const page = makeMockPage({ items: [] });
      pageModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(page),
      });

      await expect(
        service.deleteItem(FAMILY_ID, PAGE_ID, 'nonexistent', USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
