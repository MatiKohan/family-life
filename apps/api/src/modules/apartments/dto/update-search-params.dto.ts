import {
  IsIn,
  IsOptional,
  IsNumber,
  IsString,
  IsBoolean,
  Min,
} from 'class-validator';

export class UpdateSearchParamsDto {
  @IsIn(['rent', 'buy']) dealType!: 'rent' | 'buy';
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() neighbourhood?: string;
  @IsOptional() @IsNumber() @Min(0) minRooms?: number;
  @IsOptional() @IsNumber() @Min(0) maxRooms?: number;
  @IsOptional() @IsNumber() @Min(0) minPrice?: number;
  @IsOptional() @IsNumber() @Min(0) maxPrice?: number;
  @IsOptional() @IsNumber() minFloor?: number;
  @IsOptional() @IsNumber() maxFloor?: number;
  @IsOptional() @IsBoolean() requireParking?: boolean;
  @IsOptional() @IsBoolean() requireBalcony?: boolean;
  @IsOptional() @IsBoolean() requireElevator?: boolean;
  @IsOptional() @IsBoolean() requireSecureRoom?: boolean;
}
