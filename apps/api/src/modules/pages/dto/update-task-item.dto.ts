import { IsString, IsOptional, MinLength, MaxLength, IsIn } from 'class-validator';

export class UpdateTaskItemDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(500) text?: string;
  @IsOptional() @IsString() assigneeId?: string | null;
  @IsOptional() @IsIn(['todo', 'in-progress', 'done']) status?: string;
  @IsOptional() dueDate?: string | null;
}
