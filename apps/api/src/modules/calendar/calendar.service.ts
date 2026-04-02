import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireMember(userId: string, familyId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this family');
    return member;
  }

  async listEvents(
    familyId: string,
    userId: string,
    start?: string,
    end?: string,
  ) {
    await this.requireMember(userId, familyId);

    const where: {
      familyId: string;
      startAt?: { gte?: Date; lte?: Date };
    } = { familyId };

    if (start || end) {
      where.startAt = {};
      if (start) where.startAt.gte = new Date(start);
      if (end) where.startAt.lte = new Date(end);
    }

    return this.prisma.calendarEvent.findMany({
      where,
      orderBy: { startAt: 'asc' },
    });
  }

  async createEvent(familyId: string, userId: string, dto: CreateEventDto) {
    await this.requireMember(userId, familyId);

    return this.prisma.calendarEvent.create({
      data: {
        familyId,
        title: dto.title,
        description: dto.description,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        isAllDay: dto.isAllDay ?? false,
        createdBy: userId,
      },
    });
  }

  async updateEvent(
    familyId: string,
    eventId: string,
    userId: string,
    dto: UpdateEventDto,
  ) {
    await this.requireMember(userId, familyId);

    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.familyId !== familyId)
      throw new ForbiddenException('Event does not belong to this family');

    return this.prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startAt !== undefined && { startAt: new Date(dto.startAt) }),
        ...(dto.endAt !== undefined && { endAt: new Date(dto.endAt) }),
        ...(dto.isAllDay !== undefined && { isAllDay: dto.isAllDay }),
      },
    });
  }

  async deleteEvent(familyId: string, eventId: string, userId: string) {
    await this.requireMember(userId, familyId);

    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.familyId !== familyId)
      throw new ForbiddenException('Event does not belong to this family');

    await this.prisma.calendarEvent.delete({ where: { id: eventId } });
  }
}
