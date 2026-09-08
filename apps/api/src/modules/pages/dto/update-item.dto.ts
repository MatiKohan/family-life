import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

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
  @IsInt()
  @Min(0)
  quantity?: number | null;
}
