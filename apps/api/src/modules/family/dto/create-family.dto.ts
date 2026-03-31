import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFamilyDto {
  @ApiProperty({ example: 'The Smiths' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ example: '🏠' })
  @IsOptional()
  @IsString()
  emoji?: string;
}
