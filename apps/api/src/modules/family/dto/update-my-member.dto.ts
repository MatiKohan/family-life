import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class NotificationSettingsDto {
  @IsOptional() invite?: boolean;
  @IsOptional() itemAssigned?: boolean;
  @IsOptional() eventReminder?: boolean;
}

export class UpdateMyMemberDto {
  @IsOptional() @IsString() whatsappPhone?: string | null;
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notificationSettings?: NotificationSettingsDto;
}
