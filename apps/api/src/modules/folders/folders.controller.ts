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
import { IsArray, IsString } from 'class-validator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '@family-life/types';

class ReorderFoldersDto {
  @IsArray()
  @IsString({ each: true })
  folderIds!: string[];
}

@ApiTags('folders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('families/:id/folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Get()
  listFolders(@CurrentUser() user: AuthUser, @Param('id') familyId: string) {
    return this.foldersService.listFolders(familyId, user.id);
  }

  @Post()
  createFolder(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Body() dto: CreateFolderDto,
  ) {
    return this.foldersService.createFolder(familyId, user.id, dto);
  }

  @Patch('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderFolders(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Body() dto: ReorderFoldersDto,
  ) {
    await this.foldersService.reorderFolders(familyId, user.id, dto.folderIds);
  }

  @Patch(':folderId')
  updateFolder(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('folderId') folderId: string,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.foldersService.updateFolder(familyId, folderId, user.id, dto);
  }

  @Delete(':folderId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFolder(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('folderId') folderId: string,
  ) {
    await this.foldersService.deleteFolder(familyId, folderId, user.id);
  }
}
