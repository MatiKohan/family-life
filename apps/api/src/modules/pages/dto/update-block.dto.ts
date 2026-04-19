import { IsOptional, IsString } from 'class-validator';

export class UpdateBlockDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() content?: string;
}
