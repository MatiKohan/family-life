import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdatePageDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) title?: string;
  @IsOptional() @IsString() emoji?: string;
}
