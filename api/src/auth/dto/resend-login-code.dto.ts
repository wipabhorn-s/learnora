// api\src\auth\dto\resend-login-code.dto.ts

import { IsUUID } from 'class-validator';

export class ResendLoginCodeDto {
  @IsUUID()
  challengeId: string;
}
