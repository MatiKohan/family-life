import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { LIST_UNITS } from '@family-life/types';

export class UpdateItemDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(500) text?: string;
  @IsOptional() @IsBoolean() checked?: boolean;
  @IsOptional() @IsString() assigneeId?: string | null;
  @IsOptional() dueDate?: string | null;

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
