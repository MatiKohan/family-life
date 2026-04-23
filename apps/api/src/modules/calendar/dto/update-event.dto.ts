import {
  IsString,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  MinLength,
  MaxLength,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RecurrenceDto } from './recurrence.dto';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  reminderMinutesBefore?: number | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceDto)
  recurrence?: RecurrenceDto | null;

  @IsOptional()
  @IsDateString()
  instanceDate?: string;

  @IsOptional()
  @IsIn(['this', 'all', 'future'])
  editMode?: 'this' | 'all' | 'future';

  @IsOptional()
  @IsString()
  assigneeId?: string | null;
}
