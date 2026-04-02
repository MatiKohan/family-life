import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
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
};
type TaskItemData = {
  id: string;
  text: string;
  assigneeId: string | null;
  status: string;
  dueDate: string | null;
  createdAt: string;
};

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

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
      where: { familyId },
      select: { id: true, title: true, emoji: true, type: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createPage(familyId: string, userId: string, dto: CreatePageDto) {
    await this.requireMember(familyId, userId);
    return this.prisma.page.create({
      data: {
        familyId,
        title: dto.title,
        emoji: dto.emoji ?? '📄',
        type: dto.type,
        createdBy: userId,
      },
    });
  }

  async getPage(familyId: string, pageId: string, userId: string) {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId },
    });
    if (!page) throw new NotFoundException('Page not found');
    // For events type, attach calendar events
    if (page.type === 'events') {
      const eventIds = (page.eventIds as string[]) || [];
      const events =
        eventIds.length > 0
          ? await this.prisma.calendarEvent.findMany({
              where: { id: { in: eventIds } },
            })
          : [];
      return { ...page, events };
    }
    return page;
  }

  async updatePage(
    familyId: string,
    pageId: string,
    userId: string,
    dto: UpdatePageDto,
  ) {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId },
    });
    if (!page) throw new NotFoundException('Page not found');
    return this.prisma.page.update({
      where: { id: pageId },
      data: { title: dto.title, emoji: dto.emoji },
    });
  }

  async deletePage(familyId: string, pageId: string, userId: string) {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId },
    });
    if (!page) throw new NotFoundException('Page not found');
    await this.prisma.page.delete({ where: { id: pageId } });
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
      where: { id: pageId, familyId },
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
    return this.prisma.page.update({
      where: { id: pageId },
      data: { items: [...items, newItem] },
    });
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
      where: { id: pageId, familyId },
    });
    if (!page) throw new NotFoundException('Page not found');
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
    return this.prisma.page.update({ where: { id: pageId }, data: { items } });
  }

  async deleteItem(
    familyId: string,
    pageId: string,
    itemId: string,
    userId: string,
  ) {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId },
    });
    if (!page) throw new NotFoundException('Page not found');
    const items = (page.items as ListItemData[]).filter(
      (item) => item.id !== itemId,
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
      where: { id: pageId, familyId },
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
    return this.prisma.page.update({
      where: { id: pageId },
      data: { taskItems: [...taskItems, newItem] },
    });
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
      where: { id: pageId, familyId },
    });
    if (!page) throw new NotFoundException('Page not found');
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
    return this.prisma.page.update({
      where: { id: pageId },
      data: { taskItems },
    });
  }

  async deleteTaskItem(
    familyId: string,
    pageId: string,
    itemId: string,
    userId: string,
  ) {
    await this.requireMember(familyId, userId);
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, familyId },
    });
    if (!page) throw new NotFoundException('Page not found');
    const taskItems = (page.taskItems as TaskItemData[]).filter(
      (item) => item.id !== itemId,
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
      where: { id: pageId, familyId },
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
      where: { id: pageId, familyId },
    });
    if (!page) throw new NotFoundException('Page not found');
    const eventIds = (page.eventIds as string[]).filter((id) => id !== eventId);
    return this.prisma.page.update({
      where: { id: pageId },
      data: { eventIds },
    });
  }
}
