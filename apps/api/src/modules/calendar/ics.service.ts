import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import ical, { ICalEventRepeatingFreq } from 'ical-generator';
import { PrismaService } from '../../database/prisma.service';
import { parseRecurrence, type RecurrenceRule } from './calendar-recurrence';

const ICS_FREQ: Record<RecurrenceRule['freq'], ICalEventRepeatingFreq> = {
  daily: ICalEventRepeatingFreq.DAILY,
  weekly: ICalEventRepeatingFreq.WEEKLY,
  monthly: ICalEventRepeatingFreq.MONTHLY,
  yearly: ICalEventRepeatingFreq.YEARLY,
};

@Injectable()
export class IcsService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateToken(userId: string, familyId: string): Promise<string> {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!member) throw new ForbiddenException();

    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    });
    if (!family) throw new NotFoundException();

    if (family.calendarToken) return family.calendarToken;

    const token = randomUUID();
    await this.prisma.family.update({
      where: { id: familyId },
      data: { calendarToken: token },
    });
    return token;
  }

  async regenerateToken(userId: string, familyId: string): Promise<string> {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!member) throw new ForbiddenException();
    if (member.role !== 'OWNER' && member.role !== 'ADMIN')
      throw new ForbiddenException();

    const token = randomUUID();
    await this.prisma.family.update({
      where: { id: familyId },
      data: { calendarToken: token },
    });
    return token;
  }

  async generateIcs(familyId: string, token: string): Promise<string> {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      select: { id: true, name: true, calendarToken: true },
    });
    if (!family || family.calendarToken !== token)
      throw new ForbiddenException();

    const events = await this.prisma.calendarEvent.findMany({
      where: { familyId },
      orderBy: { startAt: 'asc' },
    });

    const cal = ical({ name: family.name });

    for (const ev of events) {
      const recurrence = parseRecurrence(ev.recurrence);
      cal.createEvent({
        id: ev.id,
        summary: ev.title,
        description: ev.description ?? undefined,
        start: ev.startAt,
        end: ev.endAt,
        allDay: ev.isAllDay,
        ...(recurrence
          ? {
              repeating: {
                freq: ICS_FREQ[recurrence.freq],
                ...(recurrence.until
                  ? { until: new Date(`${recurrence.until}T23:59:59.000Z`) }
                  : {}),
                ...(recurrence.exceptions?.length
                  ? {
                      exclude: recurrence.exceptions.map(
                        (d) => new Date(`${d}T00:00:00.000Z`),
                      ),
                    }
                  : {}),
              },
            }
          : {}),
      });
    }

    return cal.toString();
  }
}
