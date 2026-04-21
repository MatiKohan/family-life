import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface SearchResults {
  pages: { id: string; title: string; emoji: string; type: string }[];
  items: {
    text: string;
    pageId: string;
    pageTitle: string;
    pageEmoji: string;
  }[];
  tasks: {
    text: string;
    pageId: string;
    pageTitle: string;
    pageEmoji: string;
  }[];
  events: { id: string; title: string; startAt: string; familyId: string }[];
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    familyId: string,
    userId: string,
    q: string,
  ): Promise<SearchResults> {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a family member');

    const like = `%${q.toLowerCase()}%`;

    const [pages, itemPages, taskPages, events] = await Promise.all([
      // 1. Match page titles
      this.prisma.page.findMany({
        where: {
          familyId,
          deletedAt: null,
          title: { contains: q, mode: 'insensitive' },
        },
        select: { id: true, title: true, emoji: true, type: true },
        take: 10,
      }),

      // 2. Pages whose items JSONB contains the query string (list pages)
      this.prisma.$queryRaw<
        { id: string; title: string; emoji: string; items: string }[]
      >`
        SELECT id, title, emoji, items::text AS items
        FROM "Page"
        WHERE "familyId" = ${familyId}
          AND "deletedAt" IS NULL
          AND type = 'list'
          AND LOWER(items::text) LIKE ${like}
      `,

      // 3. Pages whose taskItems JSONB contains the query string
      this.prisma.$queryRaw<
        { id: string; title: string; emoji: string; task_items: string }[]
      >`
        SELECT id, title, emoji, "taskItems"::text AS task_items
        FROM "Page"
        WHERE "familyId" = ${familyId}
          AND "deletedAt" IS NULL
          AND type = 'tasks'
          AND LOWER("taskItems"::text) LIKE ${like}
      `,

      // 4. Calendar events matching title
      this.prisma.calendarEvent.findMany({
        where: {
          familyId,
          title: { contains: q, mode: 'insensitive' },
        },
        select: { id: true, title: true, startAt: true, familyId: true },
        take: 10,
      }),
    ]);

    // Extract matching items from list page blocks
    const items: SearchResults['items'] = [];
    for (const page of itemPages) {
      try {
        const parsed: unknown = JSON.parse(page.items);
        if (!Array.isArray(parsed)) continue;
        const blocks = parsed as Array<{
          type: string;
          items?: Array<{ text: string; id: string }>;
        }>;
        for (const block of blocks) {
          if (block.type === 'list' && Array.isArray(block.items)) {
            for (const item of block.items) {
              if (
                item.text &&
                item.text.toLowerCase().includes(q.toLowerCase())
              ) {
                items.push({
                  text: item.text,
                  pageId: page.id,
                  pageTitle: page.title,
                  pageEmoji: page.emoji,
                });
              }
            }
          }
        }
      } catch {
        // skip unparseable rows
      }
    }

    // Extract matching task items
    const tasks: SearchResults['tasks'] = [];
    for (const page of taskPages) {
      try {
        const parsed: unknown = JSON.parse(page.task_items);
        if (!Array.isArray(parsed)) continue;
        const taskItems = parsed as Array<{ text: string; id: string }>;
        for (const task of taskItems) {
          if (task.text && task.text.toLowerCase().includes(q.toLowerCase())) {
            tasks.push({
              text: task.text,
              pageId: page.id,
              pageTitle: page.title,
              pageEmoji: page.emoji,
            });
          }
        }
      } catch {
        // skip unparseable rows
      }
    }

    return {
      pages,
      items: items.slice(0, 10),
      tasks: tasks.slice(0, 10),
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        startAt: e.startAt.toISOString(),
        familyId: e.familyId,
      })),
    };
  }
}
