import {
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateItemDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(500) text?: string;
  @IsOptional() @IsBoolean() checked?: boolean;
  @IsOptional() @IsString() assigneeId?: string | null;
  @IsOptional() dueDate?: string | null;
}
