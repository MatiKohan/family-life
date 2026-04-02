import {
  IsString,
  IsIn,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreatePageDto {
  @IsString() @MinLength(1) @MaxLength(100) title!: string;
  @IsOptional() @IsString() emoji?: string;
  @IsIn(['list', 'events', 'tasks']) type!: string;
}
