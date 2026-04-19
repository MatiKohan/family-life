import { IsArray } from 'class-validator';

export class PutBlocksDto {
  @IsArray()
  blocks!: unknown[];
}
