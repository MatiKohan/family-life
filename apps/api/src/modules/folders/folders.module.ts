import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';

@Module({
  imports: [PrismaModule],
  controllers: [FoldersController],
  providers: [FoldersService],
  exports: [FoldersService],
})
export class FoldersModule {}
