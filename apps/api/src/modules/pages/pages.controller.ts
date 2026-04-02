import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateTaskItemDto } from './dto/create-task-item.dto';
import { UpdateTaskItemDto } from './dto/update-task-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '@family-life/types';

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

  @Patch(':pageId/task-items/:itemId')
  updateTaskItem(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('pageId') pageId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateTaskItemDto,
  ) {
    return this.pagesService.updateTaskItem(familyId, pageId, itemId, user.id, dto);
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
}
