import { StrongPassword } from '@/common/decorator/strong-password.decorator';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @StrongPassword()
  newPassword: string;
}
