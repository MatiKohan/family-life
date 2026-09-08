import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  IsIn,
} from 'class-validator';
import { LIST_UNITS } from '@family-life/types';

export class CreateItemDto {
  @IsString() @MinLength(1) @MaxLength(500) text!: string;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() dueDate?: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  quantity?: number | null;

  @IsOptional()
  @IsIn([...LIST_UNITS])
  unit?: (typeof LIST_UNITS)[number];
}
