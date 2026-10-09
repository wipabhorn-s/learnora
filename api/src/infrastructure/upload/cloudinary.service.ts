// src\infrastructure\upload\cloudinary.service.ts

import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { EnvVariable } from '@/config/env.validation';
import { Readable } from 'node:stream';
import { IMAGE_FORMATS } from '@/common/upload/upload-options';

export type CloudinaryAsset = {
  url: string;
  publicId: string;
};

export type CloudinaryVideoAsset = CloudinaryAsset & {
  durationSeconds: number;
};

type CloudinaryResourceType = 'image' | 'video';

/**
 * upload = เปิดด้วย URL ตรงได้เลย (รูปโปรไฟล์ รูปปกคอร์ส)
 * authenticated = ต้องมีลายเซ็นถึงเปิดได้ (วิดีโอบทเรียน ซึ่งเป็นของที่ขาย)
 */
type CloudinaryDeliveryType = 'upload' | 'authenticated';

/** อายุลิงก์วิดีโอที่ส่งให้หน้าเล่น พอสำหรับนั่งเรียนยาว ๆ แต่แชร์ต่อได้ไม่นาน */
export const VIDEO_URL_TTL_SECONDS = 6 * 60 * 60;

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  constructor(
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {
    cloudinary.config({
      cloud_name: configService.get('CLOUDINARY_CLOUD_NAME', { infer: true }),
      api_key: configService.get('CLOUDINARY_API_KEY', { infer: true }),
      api_secret: configService.get('CLOUDINARY_API_SECRET', {
        infer: true,
      }),
    });
  }

  upload(file: Express.Multer.File): Promise<CloudinaryAsset> {
    return new Promise((resolve, reject) => {
      const writableStream = cloudinary.uploader.upload_stream(
        // Cloudinary ตรวจไฟล์จริงซ้ำอีกชั้น (ไม่เชื่อ mimetype ที่ผู้ส่งบอกมา)
        { allowed_formats: IMAGE_FORMATS },
        (error, result) => {
          if (error || !result) {
            this.logger.error(error);
            reject(new InternalServerErrorException('Uploaded failed'));
            return;
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      Readable.from(file.buffer).pipe(writableStream);
    });
  }

  uploadVideo(file: Express.Multer.File): Promise<CloudinaryVideoAsset> {
    return new Promise((resolve, reject) => {
      const writableStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          // วิดีโอเป็นของที่ขาย: เปิดด้วย URL ตรงไม่ได้ ต้องขอลิงก์ที่มีลายเซ็นจาก API
          type: 'authenticated',
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error(error);
            reject(new InternalServerErrorException('Video upload failed'));
            return;
          }

          const rawDuration: unknown = result.duration;

          if (
            typeof rawDuration !== 'number' ||
            !Number.isFinite(rawDuration) ||
            rawDuration <= 0
          ) {
            reject(
              new InternalServerErrorException(
                'Could not detect video duration',
              ),
            );
            return;
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            durationSeconds: Math.round(rawDuration),
          });
        },
      );

      Readable.from(file.buffer).pipe(writableStream);
    });
  }

  /** ดูจาก URL ที่เก็บไว้ว่าไฟล์อยู่แบบไหน (วิดีโอที่อัปโหลดก่อนเปลี่ยนเป็น upload) */
  deliveryTypeOf(url: string | null | undefined): CloudinaryDeliveryType {
    return url?.includes('/authenticated/') ? 'authenticated' : 'upload';
  }

  /**
   * ลิงก์วิดีโอที่หมดอายุเอง ให้หน้าเล่นใช้แทน URL จริง
   * รองรับ Range request (กรอวิดีโอได้) หมดอายุหรือแก้ลายเซ็นแล้วตอบ 401
   * ใช้ได้ทั้งวิดีโอแบบ authenticated และแบบ upload (ของเก่า)
   */
  signedVideoUrl(
    publicId: string,
    storedUrl: string,
    ttlSeconds = VIDEO_URL_TTL_SECONDS,
  ): string {
    // สกุลไฟล์ต้องตรงกับไฟล์จริง ลายเซ็นคิดรวมสกุลไฟล์ด้วย
    const format = /\.([a-z0-9]+)(?:\?.*)?$/i.exec(storedUrl)?.[1] ?? 'mp4';
    return cloudinary.utils.private_download_url(publicId, format, {
      resource_type: 'video',
      type: this.deliveryTypeOf(storedUrl),
      expires_at: Math.floor(Date.now() / 1000) + ttlSeconds,
    });
  }

  getPublicIdFromUrl(
    url: string | null | undefined,
    resourceType: CloudinaryResourceType = 'image',
  ): string | undefined {
    if (!url) {
      return undefined;
    }

    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.hostname !== 'res.cloudinary.com') {
        return undefined;
      }

      const uploadMarker = [
        `/${resourceType}/upload/`,
        `/${resourceType}/authenticated/`,
      ].find((marker) => parsedUrl.pathname.includes(marker));

      if (!uploadMarker) {
        return undefined;
      }
      const markerIndex = parsedUrl.pathname.indexOf(uploadMarker);

      const assetPath = decodeURIComponent(
        parsedUrl.pathname.slice(markerIndex + uploadMarker.length),
      );
      const segments = assetPath.split('/').filter(Boolean);

      if (/^v\d+$/.test(segments[0] ?? '')) {
        segments.shift();
      }

      const filename = segments.at(-1);

      if (!filename) {
        return undefined;
      }

      segments[segments.length - 1] = filename.replace(/\.[^/.]+$/, '');

      return segments.join('/') || undefined;
    } catch {
      return undefined;
    }
  }

  async deleteAsset(
    publicId: string | null | undefined,
    resourceType: CloudinaryResourceType = 'image',
    deliveryType: CloudinaryDeliveryType = 'upload',
  ): Promise<void> {
    if (!publicId) {
      return;
    }

    try {
      const result: unknown = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        type: deliveryType,
        invalidate: true,
      });

      const deletionResult =
        typeof result === 'object' && result !== null && 'result' in result
          ? result.result
          : undefined;

      if (deletionResult !== 'ok' && deletionResult !== 'not found') {
        this.logger.warn(
          `Cloudinary deletion returned ${String(deletionResult)} for ${publicId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete Cloudinary asset ${publicId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
