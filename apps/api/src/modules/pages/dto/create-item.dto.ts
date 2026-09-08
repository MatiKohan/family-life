import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

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
  @IsInt()
  @Min(0)
  quantity?: number | null;
}
