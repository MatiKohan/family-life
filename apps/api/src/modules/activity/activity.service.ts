import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  log(data: {
    familyId: string;
    userId: string;
    type: string;
    payload?: Record<string, unknown>;
  }) {
    return this.prisma.activityLog.create({
      data: {
        familyId: data.familyId,
        userId: data.userId,
        type: data.type,
        payload: (data.payload ?? {}) as object,
      },
    });
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
