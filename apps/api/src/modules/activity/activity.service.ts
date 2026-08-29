import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(data: {
    familyId: string;
    userId: string;
    type: string;
    payload?: Record<string, unknown>;
  }) {
    try {
      return await this.prisma.activityLog.create({
        data: {
          familyId: data.familyId,
          userId: data.userId,
          type: data.type,
          payload: (data.payload ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to write activity log type=${data.type} family=${data.familyId}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  async getFeed(
    familyId: string,
    limit = 20,
    cursor?: string,
  ): Promise<{ items: any[]; nextCursor: string | null }> {
    const take = limit + 1;
    const logs = await this.prisma.activityLog.findMany({
      where: { familyId },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;
    return {
      items: items.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }
}
