// api\src\user\dto\connect-google.dto.ts

import { IsNotEmpty, IsString } from 'class-validator';

export class ConnectGoogleDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
