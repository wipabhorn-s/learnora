// api\src\user\dto\set-password.dto.ts

import { StrongPassword } from '@/common/decorator/strong-password.decorator';

export class SetPasswordDto {
  @StrongPassword()
  newPassword: string;
}
