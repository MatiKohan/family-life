import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { Page, PageDocument } from './schemas/page.schema';
import { PrismaService } from '../../database/prisma.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateTaskItemDto } from './dto/create-task-item.dto';
import { UpdateTaskItemDto } from './dto/update-task-item.dto';

@Injectable()
export class PagesService {
  constructor(
    @InjectModel(Page.name) private readonly pageModel: Model<PageDocument>,
    private readonly prisma: PrismaService,
  ) {}

  private async requireMember(userId: string, familyId: string): Promise<void> {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this family');
  }

  async listPages(
    familyId: string,
    userId: string,
  ): Promise<{ _id: unknown; title: string; emoji: string; type: string }[]> {
    await this.requireMember(userId, familyId);
    return this.pageModel
      .find({ familyId }, { title: 1, emoji: 1, type: 1 })
      .lean()
      .exec() as unknown as { _id: unknown; title: string; emoji: string; type: string }[];
  }

  async createPage(
    familyId: string,
    userId: string,
    dto: CreatePageDto,
  ): Promise<PageDocument> {
    await this.requireMember(userId, familyId);
    const page = new this.pageModel({
      familyId,
      title: dto.title,
      emoji: dto.emoji ?? '📄',
      type: dto.type,
      createdBy: userId,
    });
    return page.save();
  }

  async getPage(
    familyId: string,
    pageId: string,
    userId: string,
  ): Promise<PageDocument> {
    await this.requireMember(userId, familyId);
    const page = await this.pageModel.findById(pageId).exec();
    if (!page) throw new NotFoundException('Page not found');
    if (page.familyId !== familyId)
      throw new ForbiddenException('Page does not belong to this family');
    return page;
  }

  async updatePage(
    familyId: string,
    pageId: string,
    userId: string,
    dto: UpdatePageDto,
  ): Promise<PageDocument> {
    await this.requireMember(userId, familyId);
    const page = await this.pageModel.findById(pageId).exec();
    if (!page) throw new NotFoundException('Page not found');
    if (page.familyId !== familyId)
      throw new ForbiddenException('Page does not belong to this family');

    if (dto.title !== undefined) page.title = dto.title;
    if (dto.emoji !== undefined) page.emoji = dto.emoji;

    return page.save();
  }

  async deletePage(
    familyId: string,
    pageId: string,
    userId: string,
  ): Promise<void> {
    await this.requireMember(userId, familyId);
    const page = await this.pageModel.findById(pageId).exec();
    if (!page) throw new NotFoundException('Page not found');
    if (page.familyId !== familyId)
      throw new ForbiddenException('Page does not belong to this family');
    await page.deleteOne();
  }

  async addItem(
    familyId: string,
    pageId: string,
    userId: string,
    dto: CreateItemDto,
  ): Promise<PageDocument> {
    await this.requireMember(userId, familyId);
    const page = await this.pageModel.findById(pageId).exec();
    if (!page) throw new NotFoundException('Page not found');
    if (page.familyId !== familyId)
      throw new ForbiddenException('Page does not belong to this family');
    if (page.type !== 'list')
      throw new BadRequestException('Items can only be added to list pages');

    page.items.push({
      id: randomUUID(),
      text: dto.text,
      checked: false,
      assigneeId: dto.assigneeId ?? null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      createdAt: new Date(),
    });

    return page.save();
  }

  async updateItem(
    familyId: string,
    pageId: string,
    itemId: string,
    userId: string,
    dto: UpdateItemDto,
  ): Promise<PageDocument> {
    await this.requireMember(userId, familyId);
    const page = await this.pageModel.findById(pageId).exec();
    if (!page) throw new NotFoundException('Page not found');
    if (page.familyId !== familyId)
      throw new ForbiddenException('Page does not belong to this family');

    const item = page.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Item not found');

    if (dto.text !== undefined) item.text = dto.text;
    if (dto.checked !== undefined) item.checked = dto.checked;
    if ('assigneeId' in dto) item.assigneeId = dto.assigneeId ?? null;
    if ('dueDate' in dto)
      item.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    return page.save();
  }

  async deleteItem(
    familyId: string,
    pageId: string,
    itemId: string,
    userId: string,
  ): Promise<PageDocument> {
    await this.requireMember(userId, familyId);
    const page = await this.pageModel.findById(pageId).exec();
    if (!page) throw new NotFoundException('Page not found');
    if (page.familyId !== familyId)
      throw new ForbiddenException('Page does not belong to this family');

    const index = page.items.findIndex((i) => i.id === itemId);
    if (index === -1) throw new NotFoundException('Item not found');

    page.items.splice(index, 1);
    return page.save();
  }

  async addTaskItem(
    familyId: string,
    pageId: string,
    userId: string,
    dto: CreateTaskItemDto,
  ): Promise<PageDocument> {
    await this.requireMember(userId, familyId);
    const page = await this.pageModel.findById(pageId).exec();
    if (!page) throw new NotFoundException('Page not found');
    if (page.familyId !== familyId)
      throw new ForbiddenException('Page does not belong to this family');
    if (page.type !== 'tasks')
      throw new BadRequestException('Task items can only be added to tasks pages');

    page.taskItems.push({
      id: randomUUID(),
      text: dto.text,
      assigneeId: dto.assigneeId ?? null,
      status: (dto.status as 'todo' | 'in-progress' | 'done') ?? 'todo',
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      createdAt: new Date(),
    });

    return page.save();
  }

  async updateTaskItem(
    familyId: string,
    pageId: string,
    itemId: string,
    userId: string,
    dto: UpdateTaskItemDto,
  ): Promise<PageDocument> {
    await this.requireMember(userId, familyId);
    const page = await this.pageModel.findById(pageId).exec();
    if (!page) throw new NotFoundException('Page not found');
    if (page.familyId !== familyId)
      throw new ForbiddenException('Page does not belong to this family');

    const item = page.taskItems.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Task item not found');

    if (dto.text !== undefined) item.text = dto.text;
    if (dto.status !== undefined) item.status = dto.status as 'todo' | 'in-progress' | 'done';
    if ('assigneeId' in dto) item.assigneeId = dto.assigneeId ?? null;
    if ('dueDate' in dto)
      item.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    return page.save();
  }

  async deleteTaskItem(
    familyId: string,
    pageId: string,
    itemId: string,
    userId: string,
  ): Promise<PageDocument> {
    await this.requireMember(userId, familyId);
    const page = await this.pageModel.findById(pageId).exec();
    if (!page) throw new NotFoundException('Page not found');
    if (page.familyId !== familyId)
      throw new ForbiddenException('Page does not belong to this family');

    const index = page.taskItems.findIndex((i) => i.id === itemId);
    if (index === -1) throw new NotFoundException('Task item not found');

    page.taskItems.splice(index, 1);
    return page.save();
  }
}
