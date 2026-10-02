// api\src\user\dto\disable-two-factor.dto.ts

import { IsNotEmpty, IsString } from 'class-validator';

export class DisableTwoFactorDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}
