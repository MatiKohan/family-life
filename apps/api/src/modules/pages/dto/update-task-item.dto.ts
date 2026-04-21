import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RecurringTaskDto } from './recurring-task.dto';

export class UpdateTaskItemDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(500) text?: string;
  @IsOptional() @IsString() assigneeId?: string | null;
  @IsOptional() @IsIn(['todo', 'in-progress', 'done']) status?: string;
  @IsOptional() dueDate?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurringTaskDto)
  recurrence?: RecurringTaskDto | null;
}
