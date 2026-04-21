import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { IcsService } from './ics.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '@family-life/types';

@ApiTags('calendar')
@ApiBearerAuth()
@Controller()
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly icsService: IcsService,
  ) {}

  @Get('families/:id/calendar')
  @UseGuards(JwtAuthGuard)
  listEvents(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.calendarService.listEvents(familyId, user.id, start, end);
  }

  @Post('families/:id/calendar')
  @UseGuards(JwtAuthGuard)
  createEvent(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.calendarService.createEvent(familyId, user.id, dto);
  }

  @Patch('families/:id/calendar/:eventId')
  @UseGuards(JwtAuthGuard)
  updateEvent(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.calendarService.updateEvent(familyId, eventId, user.id, dto);
  }

  @Delete('families/:id/calendar/:eventId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEvent(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('eventId') eventId: string,
    @Query('instance') instance?: string,
  ) {
    await this.calendarService.deleteEvent(
      familyId,
      eventId,
      user.id,
      instance,
    );
  }

  @Get('families/:familyId/calendar-token')
  @UseGuards(JwtAuthGuard)
  async getCalendarToken(
    @Param('familyId') familyId: string,
    @CurrentUser() user: { id: string },
  ) {
    const token = await this.icsService.getOrCreateToken(user.id, familyId);
    return { token };
  }

  @Post('families/:familyId/calendar-token/regenerate')
  @UseGuards(JwtAuthGuard)
  async regenerateCalendarToken(
    @Param('familyId') familyId: string,
    @CurrentUser() user: { id: string },
  ) {
    const token = await this.icsService.regenerateToken(user.id, familyId);
    return { token };
  }

  @Get('families/:familyId/calendar.ics')
  async getCalendarIcs(
    @Param('familyId') familyId: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const ics = await this.icsService.generateIcs(familyId, token);
    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="calendar.ics"',
    });
    res.send(ics);
  }
}
