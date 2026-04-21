import { IsIn, IsDateString, IsOptional } from 'class-validator';

export class RecurringTaskDto {
  @IsIn(['daily', 'bi-daily', 'weekly', 'monthly'])
  freq!: 'daily' | 'bi-daily' | 'weekly' | 'monthly';

  @IsOptional()
  @IsDateString()
  nextDue?: string;
}
