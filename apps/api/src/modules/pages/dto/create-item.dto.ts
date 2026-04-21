import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateItemDto {
  @IsString() @MinLength(1) @MaxLength(500) text!: string;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() dueDate?: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
}
