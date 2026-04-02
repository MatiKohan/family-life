import {
  IsString,
  IsBoolean,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';

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
}
