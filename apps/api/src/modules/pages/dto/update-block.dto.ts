import { LIST_CURRENCIES, LIST_MODES } from '@family-life/types';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateBlockDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsIn([...LIST_MODES]) mode?: (typeof LIST_MODES)[number];
  @IsOptional()
  @IsIn([...LIST_CURRENCIES])
  currency?: (typeof LIST_CURRENCIES)[number];
}
