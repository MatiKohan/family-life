import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type TaskItemData = {
  id: string;
  status: string;
  dueDate?: string | null;
  recurrence?: { freq: string; nextDue: string } | null;
  [key: string]: unknown;
};

@Injectable()
export class RecurringTaskScheduler {
  private readonly logger = new Logger(RecurringTaskScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetDueRecurringTasks() {
    const today = new Date().toISOString().slice(0, 10);

    const pages = await this.prisma.page.findMany({
      where: { deletedAt: null, type: 'tasks' },
      select: { id: true, taskItems: true },
    });

    let resetCount = 0;
    for (const page of pages) {
      const items = (page.taskItems as TaskItemData[]) || [];
      let changed = false;
      const updated = items.map((item) => {
        if (
          item.status === 'done' &&
          item.recurrence?.nextDue &&
          item.recurrence.nextDue <= today
        ) {
          changed = true;
          resetCount++;
          return { ...item, status: 'todo', dueDate: item.recurrence.nextDue };
        }
        return item;
      });
      if (changed) {
        await this.prisma.page.update({
          where: { id: page.id },
          data: { taskItems: updated as unknown as Prisma.InputJsonValue },
        });
      }
    }

    this.logger.log(
      `Recurring task reset: ${resetCount} task(s) reset for ${today}`,
    );
  }
}
