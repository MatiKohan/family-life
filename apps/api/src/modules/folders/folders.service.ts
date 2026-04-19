import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireMember(familyId: string, userId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a family member');
    return member;
  }

  async listFolders(familyId: string, userId: string) {
    await this.requireMember(familyId, userId);
    return this.prisma.pageFolder.findMany({
      where: { familyId },
      select: {
        id: true,
        name: true,
        emoji: true,
        sortOrder: true,
        pages: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            emoji: true,
            type: true,
            sortOrder: true,
            folderId: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createFolder(familyId: string, userId: string, dto: CreateFolderDto) {
    await this.requireMember(familyId, userId);
    const maxOrder = await this.prisma.pageFolder.aggregate({
      where: { familyId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
    return this.prisma.pageFolder.create({
      data: {
        familyId,
        name: dto.name,
        emoji: dto.emoji ?? '📁',
        sortOrder,
      },
    });
  }

  async updateFolder(
    familyId: string,
    folderId: string,
    userId: string,
    dto: UpdateFolderDto,
  ) {
    await this.requireMember(familyId, userId);
    const folder = await this.prisma.pageFolder.findFirst({
      where: { id: folderId, familyId },
    });
    if (!folder) throw new NotFoundException('Folder not found');
    return this.prisma.pageFolder.update({
      where: { id: folderId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.emoji !== undefined ? { emoji: dto.emoji } : {}),
      },
    });
  }

  async deleteFolder(familyId: string, folderId: string, userId: string) {
    await this.requireMember(familyId, userId);
    const folder = await this.prisma.pageFolder.findFirst({
      where: { id: folderId, familyId },
    });
    if (!folder) throw new NotFoundException('Folder not found');
    // Move all pages in this folder back to root
    await this.prisma.page.updateMany({
      where: { folderId, familyId },
      data: { folderId: null },
    });
    await this.prisma.pageFolder.delete({ where: { id: folderId } });
  }

  async reorderFolders(familyId: string, userId: string, folderIds: string[]) {
    await this.requireMember(familyId, userId);
    await Promise.all(
      folderIds.map((id, index) =>
        this.prisma.pageFolder.updateMany({
          where: { id, familyId },
          data: { sortOrder: index },
        }),
      ),
    );
  }
}
