import { Test, TestingModule } from '@nestjs/testing';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '@family-life/types';

const FAMILY_ID = 'family-1';
const PAGE_ID = 'page-1';
const ITEM_ID = 'item-1';
const USER_ID = 'user-1';

const mockUser: AuthUser = {
  id: USER_ID,
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: null,
};

const mockPage = {
  id: PAGE_ID,
  familyId: FAMILY_ID,
  title: 'My List',
  emoji: '📄',
  type: 'list',
  items: [],
  taskItems: [],
  eventIds: [],
};

const mockPagesService = {
  listPages: jest.fn(),
  createPage: jest.fn(),
  getPage: jest.fn(),
  updatePage: jest.fn(),
  deletePage: jest.fn(),
  addItem: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
  addTaskItem: jest.fn(),
  updateTaskItem: jest.fn(),
  deleteTaskItem: jest.fn(),
  addEventRef: jest.fn(),
  removeEventRef: jest.fn(),
  reorderPages: jest.fn(),
  reorderItems: jest.fn(),
  reorderTaskItems: jest.fn(),
  putBlocks: jest.fn(),
  updateBlock: jest.fn(),
  addBlockItem: jest.fn(),
  updateBlockItem: jest.fn(),
  deleteBlockItem: jest.fn(),
  reorderBlockItems: jest.fn(),
};

describe('PagesController', () => {
  let controller: PagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PagesController],
      providers: [{ provide: PagesService, useValue: mockPagesService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PagesController>(PagesController);
    jest.clearAllMocks();
  });

  describe('listPages', () => {
    it('calls pagesService.listPages and returns the result', async () => {
      const pages = [mockPage];
      mockPagesService.listPages.mockResolvedValue(pages);

      const result = await controller.listPages(mockUser, FAMILY_ID);

      expect(mockPagesService.listPages).toHaveBeenCalledWith(
        FAMILY_ID,
        USER_ID,
      );
      expect(result).toEqual(pages);
    });
  });

  describe('createPage', () => {
    it('calls pagesService.createPage and returns the created page', async () => {
      mockPagesService.createPage.mockResolvedValue(mockPage);
      const dto = { title: 'My List', type: 'list' as const };

      const result = await controller.createPage(mockUser, FAMILY_ID, dto);

      expect(mockPagesService.createPage).toHaveBeenCalledWith(
        FAMILY_ID,
        USER_ID,
        dto,
      );
      expect(result).toEqual(mockPage);
    });
  });

  describe('deletePage', () => {
    it('calls pagesService.deletePage with correct params', async () => {
      mockPagesService.deletePage.mockResolvedValue(undefined);

      await controller.deletePage(mockUser, FAMILY_ID, PAGE_ID);

      expect(mockPagesService.deletePage).toHaveBeenCalledWith(
        FAMILY_ID,
        PAGE_ID,
        USER_ID,
      );
    });
  });

  describe('addItem', () => {
    it('calls pagesService.addItem and returns the updated page', async () => {
      const updatedPage = {
        ...mockPage,
        items: [
          {
            id: ITEM_ID,
            text: 'Buy milk',
            checked: false,
            assigneeId: null,
            dueDate: null,
            createdAt: '',
          },
        ],
      };
      mockPagesService.addItem.mockResolvedValue(updatedPage);
      const dto = { text: 'Buy milk' };

      const result = await controller.addItem(
        mockUser,
        FAMILY_ID,
        PAGE_ID,
        dto,
      );

      expect(mockPagesService.addItem).toHaveBeenCalledWith(
        FAMILY_ID,
        PAGE_ID,
        USER_ID,
        dto,
      );
      expect(result).toEqual(updatedPage);
    });
  });

  describe('updateItem', () => {
    it('calls pagesService.updateItem and returns the updated page', async () => {
      const updatedPage = { ...mockPage };
      mockPagesService.updateItem.mockResolvedValue(updatedPage);
      const dto = { checked: true };

      const result = await controller.updateItem(
        mockUser,
        FAMILY_ID,
        PAGE_ID,
        ITEM_ID,
        dto,
      );

      expect(mockPagesService.updateItem).toHaveBeenCalledWith(
        FAMILY_ID,
        PAGE_ID,
        ITEM_ID,
        USER_ID,
        dto,
      );
      expect(result).toEqual(updatedPage);
    });
  });
});
