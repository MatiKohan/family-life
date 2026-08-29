import { Block } from '@family-life/types';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateItemDto } from './dto/create-item.dto';
import { CreatePageDto } from './dto/create-page.dto';
import { CreateTaskItemDto } from './dto/create-task-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { UpdatePageDto } from './dto/update-page.dto';
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
  recurrence?: {
    freq: 'daily' | 'bi-daily' | 'weekly' | 'monthly';
    nextDue: string;
  } | null;
};

function advanceRecurrence(
  freq: 'daily' | 'bi-daily' | 'weekly' | 'monthly',
  fromDate: string,
): string {
  const d = new Date(fromDate + 'T00:00:00');
  if (freq === 'daily') d.setDate(d.getDate() + 1);
  else if (freq === 'bi-daily') d.setDate(d.getDate() + 2);
  else if (freq === 'weekly') d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly activityService: ActivityService,
    private readonly realtimeService: RealtimeService,
  ) {}

  private async requireMember(familyId: string, userId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a family member');
    return member;
  }

  private async notifyAssignment(
    familyId: string,
    actorUserId: string,
    assigneeId: string | null | undefined,
    itemText: string,
  ): Promise<void> {
    if (!assigneeId || assigneeId === actorUserId) return;
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      select: { name: true, emoji: true },
    });
    if (!family) return;
    void this.notificationsService.sendAssignmentNotification(
      familyId,
      assigneeId,
      itemText,
      family.name,
      family.emoji,
    );
  }

  private notifyFamilyActivity(
    familyId: string,
    actorUserId: string,
    message: string,
    url: string,
    excludeUserIds: Array<string | null | undefined> = [],
  ): void {
    void this.notificationsService.sendFamilyActivityNotification({
      familyId,
      actorUserId,
      excludeUserIds,
      message,
      url,
    });
  }

  private async recordActivity(data: {
    familyId: string;
    userId: string;
    type: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    await this.activityService.log(data);
    this.realtimeService.emit(data.familyId, 'activity');
  }

  /** Attach an item to the requested list block. Empty pages store `[]` and
   *  getPage synthesizes a new block id on each load — adopt the client's id. */
  private addItemToListBlocks(
    blocks: Block[],
    blockId: string,
    newItem: ListItemData,
  ): Block[] {
    const match = blocks.find((b) => b.id === blockId && b.type === 'list');
    if (match && match.type === 'list') {
      return blocks.map((b) =>
        b.id === blockId && b.type === 'list'
          ? { ...b, items: [...b.items, newItem] }
          : b,
      );
    }
    const firstListIdx = blocks.findIndex((b) => b.type === 'list');
    if (firstListIdx >= 0) {
      return blocks.map((b, i) => {
        if (i !== firstListIdx || b.type !== 'list') return b;
        return {
          ...b,
          id: b.items.length === 0 ? blockId : b.id,
          items: [...b.items, newItem],
        };
      });
    }
    return [...blocks, { id: blockId, type: 'list', items: [newItem] }];
  }

  private normalizeBlocks(rawItems: unknown[]): Block[] {
    if (rawItems.length === 0) {
      return [{ id: randomUUID(), type: 'list', items: [] }];
    }
    const first = rawItems[0] as Record<string, unknown>;
    if (first['type'] === 'list' || first['type'] === 'text') {
      return rawItems as Block[];
    }
    // Legacy: flat ListItem array → wrap in a single list block
    const legacyItems = (rawItems as ListItemData[]).filter(
      (i) => !i.deletedAt,
    );
    return [{ id: randomUUID(), type: 'list', items: legacyItems }];
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
    const created = await this.prisma.page.create({
      data: {
        familyId,
        title: dto.title,
        emoji: dto.emoji ?? '📄',
        type: dto.type,
        sortOrder,
        createdBy: userId,
        ...(dto.type === 'list'
          ? {
              items: [
                { id: randomUUID(), type: 'list', items: [] },
              ] as unknown as Prisma.InputJsonValue,
            }
          : {}),
        ...(dto.metadata ? { metadata: metadataValue } : {}),
      },
    });
    this.realtimeService.emit(familyId, 'pages');
    this.notifyFamilyActivity(
      familyId,
      userId,
      `created a new page: ${created.title}`,
      `/family/${familyId}/pages/${created.id}`,
    );
    return created;
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
    const blocks =
      page.type === 'list'
        ? this.normalizeBlocks(items as unknown[])
        : undefined;
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
    return { ...page, items, taskItems, blocks };
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
    const updated = await this.prisma.page.update({
      where: { id: pageId },
      data: {
        title: dto.title,
        emoji: dto.emoji,
        ...(dto.folderId !== undefined ? { folderId: dto.folderId } : {}),
      },
    });
    this.realtimeService.emit(familyId, 'pages');
    return updated;
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
    this.realtimeService.emit(familyId, 'pages');
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
    this.realtimeService.emit(familyId, 'pages');
    await this.recordActivity({
      familyId,
      userId,
      type: 'item_added',
      payload: { pageId, pageTitle: page.title, itemText: newItem.text },
    });
    await this.notifyAssignment(
      familyId,
      userId,
      newItem.assigneeId,
      newItem.text,
    );
    this.notifyFamilyActivity(
      familyId,
      userId,
      `added "${newItem.text}" to ${page.title}`,
      `/family/${familyId}/pages/${pageId}`,
      [newItem.assigneeId],
    );
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
    this.realtimeService.emit(familyId, 'pages');
    if (dto.checked === true && !existingItem?.checked) {
      const updatedItem = items.find((i) => i.id === itemId);
      await this.recordActivity({
        familyId,
        userId,
        type: 'item_checked',
        payload: {
          pageId,
          pageTitle: page.title,
          itemText: updatedItem?.text ?? '',
        },
      });
    }
    if (assigneeChanged && dto.assigneeId) {
      const updatedItem = items.find((i) => i.id === itemId);
      await this.notifyAssignment(
        familyId,
        userId,
        dto.assigneeId,
        updatedItem?.text ?? '',
      );
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
    const result = await this.prisma.page.update({
      where: { id: pageId },
      data: { items },
    });
    this.realtimeService.emit(familyId, 'pages');
    return result;
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
      recurrence: dto.recurrence
        ? {
            freq: dto.recurrence.freq,
            nextDue:
              dto.recurrence.nextDue ??
              dto.dueDate ??
              new Date().toISOString().slice(0, 10),
          }
        : null,
      createdAt: new Date().toISOString(),
    };
    const result = await this.prisma.page.update({
      where: { id: pageId },
      data: { taskItems: [...taskItems, newItem] },
    });
    this.realtimeService.emit(familyId, 'pages');
    await this.recordActivity({
      familyId,
      userId,
      type: 'task_created',
      payload: { pageId, pageTitle: page.title, taskTitle: newItem.text },
    });
    await this.notifyAssignment(
      familyId,
      userId,
      newItem.assigneeId,
      newItem.text,
    );
    this.notifyFamilyActivity(
      familyId,
      userId,
      `added a task "${newItem.text}" to ${page.title}`,
      `/family/${familyId}/pages/${pageId}`,
      [newItem.assigneeId],
    );
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
    const taskItems = (page.taskItems as TaskItemData[]).map((item) => {
      if (item.id !== itemId) return item;
      const patched: TaskItemData = {
        ...item,
        ...Object.fromEntries(
          Object.entries(dto).filter(([, v]) => v !== undefined),
        ),
      };
      // Advance nextDue when a recurring task is marked done — cron resets to todo when due
      if (patched.status === 'done' && patched.recurrence) {
        const nextDue = advanceRecurrence(
          patched.recurrence.freq,
          patched.recurrence.nextDue,
        );
        return {
          ...patched,
          recurrence: { ...patched.recurrence, nextDue },
        };
      }
      return patched;
    });
    const result = await this.prisma.page.update({
      where: { id: pageId },
      data: { taskItems },
    });
    this.realtimeService.emit(familyId, 'pages');
    if (dto.status !== undefined && dto.status !== existingTaskItem?.status) {
      const updatedTaskItem = taskItems.find((i) => i.id === itemId);
      await this.recordActivity({
        familyId,
        userId,
        type: 'task_status_changed',
        payload: {
          pageId,
          pageTitle: page.title,
          taskTitle: updatedTaskItem?.text ?? '',
          status: dto.status,
        },
      });
    }
    if (assigneeChanged && dto.assigneeId) {
      const updatedTaskItem = taskItems.find((i) => i.id === itemId);
      await this.notifyAssignment(
        familyId,
        userId,
        dto.assigneeId,
        updatedTaskItem?.text ?? '',
      );
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
    const result = await this.prisma.page.update({
      where: { id: pageId },
      data: { taskItems },
    });
    this.realtimeService.emit(familyId, 'pages');
    return result;
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
      const updated = await this.prisma.page.update({
        where: { id: pageId },
        data: { eventIds: [...eventIds, eventId] },
      });
      this.realtimeService.emit(familyId, 'pages');
      return updated;
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
    const updated = await this.prisma.page.update({
      where: { id: pageId },
      data: { eventIds },
    });
    this.realtimeService.emit(familyId, 'pages');
    return updated;
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

  async putBlocks(
    familyId: string,
    pageId: string,
    userId: string,
    blocks: Block[],
  ): Promise<void> {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    await this.prisma.page.update({
      where: { id: pageId },
      data: { items: blocks as unknown as Prisma.InputJsonValue },
    });
    this.realtimeService.emit(familyId, 'pages');
  }

  async updateBlock(
    familyId: string,
    pageId: string,
    blockId: string,
    userId: string,
    patch: { title?: string; content?: string },
  ): Promise<void> {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    const blocks = this.normalizeBlocks(page.items as unknown[]);
    const updated = blocks.map((b) =>
      b.id === blockId ? { ...b, ...patch } : b,
    );
    await this.prisma.page.update({
      where: { id: pageId },
      data: { items: updated as unknown as Prisma.InputJsonValue },
    });
    this.realtimeService.emit(familyId, 'pages');
  }

  async addBlockItem(
    familyId: string,
    pageId: string,
    blockId: string,
    userId: string,
    text: string,
    assigneeId?: string,
    dueDate?: string,
  ): Promise<ListItemData> {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    const blocks = this.normalizeBlocks(page.items as unknown[]);
    const newItem: ListItemData = {
      id: randomUUID(),
      text,
      checked: false,
      assigneeId: assigneeId ?? null,
      dueDate: dueDate ?? null,
      createdAt: new Date().toISOString(),
    };
    const updated = this.addItemToListBlocks(blocks, blockId, newItem);
    await this.prisma.page.update({
      where: { id: pageId },
      data: { items: updated as unknown as Prisma.InputJsonValue },
    });
    this.realtimeService.emit(familyId, 'pages');
    await this.recordActivity({
      familyId,
      userId,
      type: 'item_added',
      payload: { pageId, pageTitle: page.title, itemText: newItem.text },
    });
    await this.notifyAssignment(
      familyId,
      userId,
      newItem.assigneeId,
      newItem.text,
    );
    this.notifyFamilyActivity(
      familyId,
      userId,
      `added "${newItem.text}" to ${page.title}`,
      `/family/${familyId}/pages/${pageId}`,
      [newItem.assigneeId],
    );
    return newItem;
  }

  async updateBlockItem(
    familyId: string,
    pageId: string,
    blockId: string,
    itemId: string,
    userId: string,
    patch: {
      text?: string;
      checked?: boolean;
      assigneeId?: string | null;
      dueDate?: string | null;
    },
  ): Promise<void> {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    const blocks = this.normalizeBlocks(page.items as unknown[]);
    const existingBlock = blocks.find((b) => b.id === blockId);
    const existingItem =
      existingBlock?.type === 'list'
        ? existingBlock.items.find((i) => i.id === itemId)
        : undefined;
    const assigneeChanged =
      patch.assigneeId != null &&
      patch.assigneeId !== existingItem?.assigneeId &&
      patch.assigneeId !== userId;
    const updated = blocks.map((b) => {
      if (b.id !== blockId || b.type !== 'list') return b;
      return {
        ...b,
        items: b.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
      };
    });
    await this.prisma.page.update({
      where: { id: pageId },
      data: { items: updated as unknown as Prisma.InputJsonValue },
    });
    this.realtimeService.emit(familyId, 'pages');
    if (patch.checked === true && !existingItem?.checked) {
      const patchedText = patch.text ?? existingItem?.text ?? '';
      await this.recordActivity({
        familyId,
        userId,
        type: 'item_checked',
        payload: { pageId, pageTitle: page.title, itemText: patchedText },
      });
    }
    if (assigneeChanged && patch.assigneeId) {
      const patchedText = patch.text ?? existingItem?.text ?? '';
      await this.notifyAssignment(
        familyId,
        userId,
        patch.assigneeId,
        patchedText,
      );
    }
  }

  async reorderBlockItems(
    familyId: string,
    pageId: string,
    blockId: string,
    userId: string,
    itemIds: string[],
  ): Promise<void> {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    const blocks = this.normalizeBlocks(page.items as unknown[]);
    const updated = blocks.map((b) => {
      if (b.id !== blockId || b.type !== 'list') return b;
      const sorted = itemIds
        .map((id) => b.items.find((i) => i.id === id))
        .filter((i): i is ListItemData => i !== undefined);
      return { ...b, items: sorted };
    });
    await this.prisma.page.update({
      where: { id: pageId },
      data: { items: updated as unknown as Prisma.InputJsonValue },
    });
    this.realtimeService.emit(familyId, 'pages');
  }

  async deleteBlockItem(
    familyId: string,
    pageId: string,
    blockId: string,
    itemId: string,
    userId: string,
  ): Promise<void> {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Page not found');
    const blocks = this.normalizeBlocks(page.items as unknown[]);
    const updated = blocks.map((b) => {
      if (b.id !== blockId || b.type !== 'list') return b;
      return { ...b, items: b.items.filter((i) => i.id !== itemId) };
    });
    await this.prisma.page.update({
      where: { id: pageId },
      data: { items: updated as unknown as Prisma.InputJsonValue },
    });
    this.realtimeService.emit(familyId, 'pages');
  }
}
