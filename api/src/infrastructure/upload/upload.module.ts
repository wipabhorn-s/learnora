// src\infrastructure\upload\upload.module.ts

import { CloudinaryService } from '@/infrastructure/upload/cloudinary.service';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class UploadModule {}
