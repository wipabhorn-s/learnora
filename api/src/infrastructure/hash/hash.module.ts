// api\src\infrastructure\hash\hash.module.ts

import { Global, Module } from '@nestjs/common';
import { BcryptService } from './bcrypt.service';

@Global()
@Module({
  providers: [BcryptService],
  exports: [BcryptService],
})
export class HashModule {}
