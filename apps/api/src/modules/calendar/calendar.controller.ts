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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '@family-life/types';

@ApiTags('calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('families/:id/calendar')
  listEvents(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.calendarService.listEvents(familyId, user.id, start, end);
  }

  @Post('families/:id/calendar')
  createEvent(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.calendarService.createEvent(familyId, user.id, dto);
  }

  @Patch('families/:id/calendar/:eventId')
  updateEvent(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.calendarService.updateEvent(familyId, eventId, user.id, dto);
  }

  @Delete('families/:id/calendar/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEvent(
    @CurrentUser() user: AuthUser,
    @Param('id') familyId: string,
    @Param('eventId') eventId: string,
    @Query('instance') instance?: string,
  ) {
    await this.calendarService.deleteEvent(familyId, eventId, user.id, instance);
  }
}
