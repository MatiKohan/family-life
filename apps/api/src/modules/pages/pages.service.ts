import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateTaskItemDto } from './dto/create-task-item.dto';
import { UpdateTaskItemDto } from './dto/update-task-item.dto';

// Types for internal use
type ListItemData = {
  id: string;
  text: string;
  checked: boolean;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  deletedAt?: string | null;
};
type TaskItemData = {
  id: string;
  text: string;
  assigneeId: string | null;
  status: string;
  dueDate: string | null;
  createdAt: string;
  deletedAt?: string | null;
};

@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async requireMember(familyId: string, userId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a family member');
    return member;
  }

  async listPages(familyId: string, userId: string) {
    await this.requireMember(familyId, userId);
    return this.prisma.page.findMany({
      where: { familyId, deletedAt: null },
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
  }

  async createPage(familyId: string, userId: string, dto: CreatePageDto) {
    await this.requireMember(familyId, userId);
    const maxOrder = await this.prisma.page.aggregate({
      where: { familyId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
    const metadataValue = dto.metadata as any;
    return this.prisma.page.create({
      data: {
        familyId,
        title: dto.title,
        emoji: dto.emoji ?? '📄',
        type: dto.type,
        sortOrder,
        createdBy: userId,
        ...(dto.metadata ? { metadata: metadataValue } : {}),
      },
    });
  }

  async getPage(familyId: string, pageId: string, userId: string) {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    // Filter soft-deleted items
    const items = ((page.items as ListItemData[]) || []).filter(
      (i) => !i.deletedAt,
    );
    const taskItems = ((page.taskItems as TaskItemData[]) || []).filter(
      (i) => !i.deletedAt,
    );
    // For events type, attach calendar events
    if (page.type === 'events') {
      const eventIds = (page.eventIds as string[]) || [];
      const events =
        eventIds.length > 0
          ? await this.prisma.calendarEvent.findMany({
              where: { id: { in: eventIds } },
            })
          : [];
      return { ...page, items, taskItems, events };
    }
    return { ...page, items, taskItems };
  }

  async updatePage(
    familyId: string,
    pageId: string,
    userId: string,
    dto: UpdatePageDto,
  ) {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    return this.prisma.page.update({
      where: { id: pageId },
      data: {
        title: dto.title,
        emoji: dto.emoji,
        ...(dto.folderId !== undefined ? { folderId: dto.folderId } : {}),
      },
    });
  }

  async deletePage(familyId: string, pageId: string, userId: string) {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    await this.prisma.page.update({
      where: { id: pageId },
      data: { deletedAt: new Date() },
    });
  }

  // List items
  async addItem(
    familyId: string,
    pageId: string,
    userId: string,
    dto: CreateItemDto,
  ) {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    if (page.type !== 'list') throw new BadRequestException('Not a list page');
    const items = (page.items as ListItemData[]) || [];
    const newItem: ListItemData = {
      id: crypto.randomUUID(),
      text: dto.text,
      checked: false,
      assigneeId: dto.assigneeId ?? null,
      dueDate: dto.dueDate ?? null,
      createdAt: new Date().toISOString(),
    };
    const result = await this.prisma.page.update({
      where: { id: pageId },
      data: { items: [...items, newItem] },
    });
    if (newItem.assigneeId && newItem.assigneeId !== userId) {
      const family = await this.prisma.family.findUnique({
        where: { id: familyId },
        select: { name: true, emoji: true },
      });
      if (family) {
        void this.notificationsService.sendAssignmentNotification(
          familyId,
          newItem.assigneeId,
          newItem.text,
          family.name,
          family.emoji,
        );
      }
    }
    return result;
  }

  async updateItem(
    familyId: string,
    pageId: string,
    itemId: string,
    userId: string,
    dto: UpdateItemDto,
  ) {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    const existingItem = (page.items as ListItemData[]).find(
      (i) => i.id === itemId,
    );
    const assigneeChanged =
      dto.assigneeId != null &&
      dto.assigneeId !== existingItem?.assigneeId &&
      dto.assigneeId !== userId;
    const items = (page.items as ListItemData[]).map((item) =>
      item.id === itemId
        ? {
            ...item,
            ...Object.fromEntries(
              Object.entries(dto).filter(([, v]) => v !== undefined),
            ),
          }
        : item,
    );
    const result = await this.prisma.page.update({
      where: { id: pageId },
      data: { items },
    });
    if (assigneeChanged && dto.assigneeId) {
      const family = await this.prisma.family.findUnique({
        where: { id: familyId },
        select: { name: true, emoji: true },
      });
      if (family) {
        const updatedItem = items.find((i) => i.id === itemId);
        void this.notificationsService.sendAssignmentNotification(
          familyId,
          dto.assigneeId,
          updatedItem?.text ?? '',
          family.name,
          family.emoji,
        );
      }
    }
    return result;
  }

  async deleteItem(
    familyId: string,
    pageId: string,
    itemId: string,
    userId: string,
  ) {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    const items = (page.items as ListItemData[]).map((item) =>
      item.id === itemId
        ? { ...item, deletedAt: new Date().toISOString() }
        : item,
    );
    return this.prisma.page.update({ where: { id: pageId }, data: { items } });
  }

  // Task items
  async addTaskItem(
    familyId: string,
    pageId: string,
    userId: string,
    dto: CreateTaskItemDto,
  ) {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    if (page.type !== 'tasks')
      throw new BadRequestException('Not a tasks page');
    const taskItems = (page.taskItems as TaskItemData[]) || [];
    const newItem: TaskItemData = {
      id: crypto.randomUUID(),
      text: dto.text,
      assigneeId: dto.assigneeId ?? null,
      status: dto.status ?? 'todo',
      dueDate: dto.dueDate ?? null,
      createdAt: new Date().toISOString(),
    };
    const result = await this.prisma.page.update({
      where: { id: pageId },
      data: { taskItems: [...taskItems, newItem] },
    });
    if (newItem.assigneeId && newItem.assigneeId !== userId) {
      const family = await this.prisma.family.findUnique({
        where: { id: familyId },
        select: { name: true, emoji: true },
      });
      if (family) {
        void this.notificationsService.sendAssignmentNotification(
          familyId,
          newItem.assigneeId,
          newItem.text,
          family.name,
          family.emoji,
        );
      }
    }
    return result;
  }

  async updateTaskItem(
    familyId: string,
    pageId: string,
    itemId: string,
    userId: string,
    dto: UpdateTaskItemDto,
  ) {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    const existingTaskItem = (page.taskItems as TaskItemData[]).find(
      (i) => i.id === itemId,
    );
    const assigneeChanged =
      dto.assigneeId != null &&
      dto.assigneeId !== existingTaskItem?.assigneeId &&
      dto.assigneeId !== userId;
    const taskItems = (page.taskItems as TaskItemData[]).map((item) =>
      item.id === itemId
        ? {
            ...item,
            ...Object.fromEntries(
              Object.entries(dto).filter(([, v]) => v !== undefined),
            ),
          }
        : item,
    );
    const result = await this.prisma.page.update({
      where: { id: pageId },
      data: { taskItems },
    });
    if (assigneeChanged && dto.assigneeId) {
      const family = await this.prisma.family.findUnique({
        where: { id: familyId },
        select: { name: true, emoji: true },
      });
      if (family) {
        const updatedTaskItem = taskItems.find((i) => i.id === itemId);
        void this.notificationsService.sendAssignmentNotification(
          familyId,
          dto.assigneeId,
          updatedTaskItem?.text ?? '',
          family.name,
          family.emoji,
        );
      }
    }
    return result;
  }

  async deleteTaskItem(
    familyId: string,
    pageId: string,
    itemId: string,
    userId: string,
  ) {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    const taskItems = (page.taskItems as TaskItemData[]).map((item) =>
      item.id === itemId
        ? { ...item, deletedAt: new Date().toISOString() }
        : item,
    );
    return this.prisma.page.update({
      where: { id: pageId },
      data: { taskItems },
    });
  }

  // Event refs
  async addEventRef(
    familyId: string,
    pageId: string,
    userId: string,
    eventId: string,
  ) {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    const eventIds = (page.eventIds as string[]) || [];
    if (!eventIds.includes(eventId)) {
      return this.prisma.page.update({
        where: { id: pageId },
        data: { eventIds: [...eventIds, eventId] },
      });
    }
    return page;
  }

  async removeEventRef(
    familyId: string,
    pageId: string,
    userId: string,
    eventId: string,
  ) {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    const eventIds = (page.eventIds as string[]).filter((id) => id !== eventId);
    return this.prisma.page.update({
      where: { id: pageId },
      data: { eventIds },
    });
  }

  async reorderPages(familyId: string, userId: string, pageIds: string[]) {
    await this.requireMember(familyId, userId);
    await Promise.all(
      pageIds.map((id, index) =>
        this.prisma.page.updateMany({
          where: { id, familyId },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  async reorderItems(
    familyId: string,
    pageId: string,
    userId: string,
    itemIds: string[],
  ) {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    const items = page.items as ListItemData[];
    const deleted = items.filter((i) => i.deletedAt);
    const reordered = itemIds
      .map((id) => items.find((i) => i.id === id && !i.deletedAt))
      .filter((i): i is ListItemData => !!i);
    return this.prisma.page.update({
      where: { id: pageId },
      data: { items: [...reordered, ...deleted] },
    });
  }

  async reorderTaskItems(
    familyId: string,
    pageId: string,
    userId: string,
    taskItemIds: string[],
  ) {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    const taskItems = page.taskItems as TaskItemData[];
    const deleted = taskItems.filter((i) => i.deletedAt);
    const reordered = taskItemIds
      .map((id) => taskItems.find((i) => i.id === id && !i.deletedAt))
      .filter((i): i is TaskItemData => !!i);
    return this.prisma.page.update({
      where: { id: pageId },
      data: { taskItems: [...reordered, ...deleted] },
    });
  }
}
