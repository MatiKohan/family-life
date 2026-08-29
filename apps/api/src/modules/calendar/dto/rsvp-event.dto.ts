import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class RsvpEventDto {
  @IsIn(['going', 'maybe', 'no'])
  status!: 'going' | 'maybe' | 'no';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bringing?: string;
}
