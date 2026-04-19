import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString, IsArray } from 'class-validator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

class EventRefDto {
  @IsString()
  eventId!: string;
}

class ReorderPagesDto {
  @IsArray()
  @IsString({ each: true })
  pageIds!: string[];
}

class ReorderItemsDto {
  @IsArray()
  @IsString({ each: true })
  itemIds!: string[];
}

class ReorderTaskItemsDto {
  @IsArray()
  @IsString({ each: true })
  taskItemIds!: string[];
}
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateTaskItemDto } from './dto/create-task-item.dto';
import { UpdateTaskItemDto } from './dto/update-task-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser, Block } from '@family-life/types';
import { PutBlocksDto } from './dto/put-blocks.dto';
import { UpdateBlockDto } from './dto/update-block.dto';

@ApiTags('pages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('families/:id/pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  listPages(@CurrentUser() user: AuthUser, @Param('id') familyId: string) {
    return this.pagesService.listPages(familyId, user.id);
  }

  @Post()
  createPage(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Body() dto: CreatePageDto,
  ) {
    return this.pagesService.createPage(familyId, user.id, dto);
  }

  @Get(':pageId')
  getPage(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.pagesService.getPage(familyId, pageId, user.id);
  }

  @Patch('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderPages(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Body() dto: ReorderPagesDto,
  ) {
    await this.pagesService.reorderPages(familyId, user.id, dto.pageIds);
  }

  @Patch(':pageId')
  updatePage(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('pageId') pageId: string,
    @Body() dto: UpdatePageDto,
  ) {
    return this.pagesService.updatePage(familyId, pageId, user.id, dto);
  }

  @Delete(':pageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePage(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('pageId') pageId: string,
  ) {
    await this.pagesService.deletePage(familyId, pageId, user.id);
  }

  @Post(':pageId/items')
  addItem(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('pageId') pageId: string,
    @Body() dto: CreateItemDto,
  ) {
    return this.pagesService.addItem(familyId, pageId, user.id, dto);
  }

  @Patch(':pageId/items/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderItems(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('pageId') pageId: string,
    @Body() dto: ReorderItemsDto,
  ) {
    await this.pagesService.reorderItems(
      familyId,
      pageId,
      user.id,
      dto.itemIds,
    );
  }

  @Patch(':pageId/items/:itemId')
  updateItem(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('pageId') pageId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.pagesService.updateItem(familyId, pageId, itemId, user.id, dto);
  }

  @Delete(':pageId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteItem(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('pageId') pageId: string,
    @Param('itemId') itemId: string,
  ) {
    await this.pagesService.deleteItem(familyId, pageId, itemId, user.id);
  }

  @Post(':pageId/task-items')
  addTaskItem(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('pageId') pageId: string,
    @Body() dto: CreateTaskItemDto,
  ) {
    return this.pagesService.addTaskItem(familyId, pageId, user.id, dto);
  }

  @Patch(':pageId/task-items/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderTaskItems(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('pageId') pageId: string,
    @Body() dto: ReorderTaskItemsDto,
  ) {
    await this.pagesService.reorderTaskItems(
      familyId,
      pageId,
      user.id,
      dto.taskItemIds,
    );
  }

  @Patch(':pageId/task-items/:itemId')
  updateTaskItem(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('pageId') pageId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateTaskItemDto,
  ) {
    return this.pagesService.updateTaskItem(
      familyId,
      pageId,
      itemId,
      user.id,
      dto,
    );
  }

  @Delete(':pageId/task-items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTaskItem(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('pageId') pageId: string,
    @Param('itemId') itemId: string,
  ) {
    await this.pagesService.deleteTaskItem(familyId, pageId, itemId, user.id);
  }

  @Post(':pageId/event-refs')
  addEventRef(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('pageId') pageId: string,
    @Body() dto: EventRefDto,
  ) {
    return this.pagesService.addEventRef(
      familyId,
      pageId,
      user.id,
      dto.eventId,
    );
  }

  @Delete(':pageId/event-refs/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEventRef(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('pageId') pageId: string,
    @Param('eventId') eventId: string,
  ) {
    await this.pagesService.removeEventRef(familyId, pageId, user.id, eventId);
  }

  @Put(':pageId/blocks')
  @HttpCode(HttpStatus.NO_CONTENT)
  async putBlocks(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('pageId') pageId: string,
    @Body() dto: PutBlocksDto,
  ) {
    await this.pagesService.putBlocks(
      familyId,
      pageId,
      user.id,
      dto.blocks as Block[],
    );
  }

  @Patch(':pageId/blocks/:blockId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateBlock(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('pageId') pageId: string,
    @Param('blockId') blockId: string,
    @Body() dto: UpdateBlockDto,
  ) {
    await this.pagesService.updateBlock(
      familyId,
      pageId,
      blockId,
      user.id,
      dto,
    );
  }

  @Post(':pageId/blocks/:blockId/items')
  addBlockItem(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('pageId') pageId: string,
    @Param('blockId') blockId: string,
    @Body() dto: CreateItemDto,
  ) {
    return this.pagesService.addBlockItem(
      familyId,
      pageId,
      blockId,
      user.id,
      dto.text,
      dto.assigneeId,
      dto.dueDate,
    );
  }

  @Patch(':pageId/blocks/:blockId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateBlockItem(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('pageId') pageId: string,
    @Param('blockId') blockId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    await this.pagesService.updateBlockItem(
      familyId,
      pageId,
      blockId,
      itemId,
      user.id,
      dto,
    );
  }

  @Delete(':pageId/blocks/:blockId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBlockItem(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('pageId') pageId: string,
    @Param('blockId') blockId: string,
    @Param('itemId') itemId: string,
  ) {
    await this.pagesService.deleteBlockItem(
      familyId,
      pageId,
      blockId,
      itemId,
      user.id,
    );
  }
}
