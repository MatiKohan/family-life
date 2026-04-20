import { IsIn, IsOptional, IsDateString } from 'class-validator';

export class RecurrenceDto {
  @IsIn(['daily', 'weekly', 'monthly', 'yearly'])
  freq!: string;

  @IsOptional()
  @IsDateString()
  until?: string;
}
