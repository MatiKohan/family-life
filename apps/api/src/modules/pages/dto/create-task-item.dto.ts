import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsIn,
} from 'class-validator';

export class CreateTaskItemDto {
  @IsString() @MinLength(1) @MaxLength(500) text!: string;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsIn(['todo', 'in-progress', 'done']) status?: string;
  @IsOptional() dueDate?: string;
}
