import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import ical from 'ical-generator';
import { PrismaService } from '../../database/prisma.service';

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
      cal.createEvent({
        id: ev.id,
        summary: ev.title,
        description: ev.description ?? undefined,
        start: ev.startAt,
        end: ev.endAt,
        allDay: ev.isAllDay,
      });
    }

    return cal.toString();
  }
}
