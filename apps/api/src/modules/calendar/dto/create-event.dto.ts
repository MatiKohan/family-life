import {
  IsString,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  reminderMinutesBefore?: number;
}
