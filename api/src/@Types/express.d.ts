// api\src\@Types\express.d.ts

import { AccessTokenPayload } from '@/auth/types/jwt-payload';
import 'express';

declare module 'express' {
  interface Request {
    user?: AccessTokenPayload;
  }
}
