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

export class CreateTaskItemDto {
  @IsString() @MinLength(1) @MaxLength(500) text!: string;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsIn(['todo', 'in-progress', 'done']) status?: string;
  @IsOptional() dueDate?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurringTaskDto)
  recurrence?: RecurringTaskDto;
}
