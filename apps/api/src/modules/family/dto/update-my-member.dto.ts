import {
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class NotificationSettingsDto {
  @IsOptional() @IsBoolean() invite?: boolean;
  @IsOptional() @IsBoolean() itemAssigned?: boolean;
  @IsOptional() @IsBoolean() eventReminder?: boolean;
  @IsOptional() @IsBoolean() itemAdded?: boolean;
}

export class UpdateMyMemberDto {
  @IsOptional() @IsString() whatsappPhone?: string | null;
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notificationSettings?: NotificationSettingsDto;
}
