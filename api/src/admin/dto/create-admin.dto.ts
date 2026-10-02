import { StrongPassword } from '@/common/decorator/strong-password.decorator';
import { Trim } from '@/common/decorator/trim.decorator';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateAdminDto {
  @IsString()
  @IsNotEmpty()
  @Trim()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @Trim()
  lastName: string;

  @IsEmail()
  email: string;

  @StrongPassword()
  password: string;
}
