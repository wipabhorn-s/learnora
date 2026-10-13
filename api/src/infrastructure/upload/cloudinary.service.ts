// src\infrastructure\upload\cloudinary.service.ts

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { EnvVariable } from '@/config/env.validation';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { IMAGE_FORMATS, VIDEO_MAX_BYTES } from '@/common/upload/upload-options';

export type CloudinaryAsset = {
  url: string;
  publicId: string;
};

export type CloudinaryVideoAsset = CloudinaryAsset & {
  durationSeconds: number;
};

/**
 * ใบอนุญาตให้เบราว์เซอร์อัปโหลดวิดีโอ 1 ไฟล์ตรงไป Cloudinary
 * ส่ง fields ทั้งหมด + ไฟล์ (ชื่อช่อง file) เป็น multipart ไปที่ uploadUrl
 */
export type VideoUploadTicket = {
  uploadUrl: string;
  fields: Record<string, string>;
};

/** วิดีโอบทเรียนเก็บที่ lessons/<รหัสผู้สอน>/<uuid> ใช้ยืนยันว่าใครอัปโหลด */
const LESSON_VIDEO_FOLDER = 'lessons';
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

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

  /**
   * ออกใบอนุญาตอัปโหลดวิดีโอบทเรียน 1 ไฟล์ (ลายเซ็นใช้ได้ราว 1 ชม. ตามกติกา Cloudinary)
   *
   * วิดีโอไม่ผ่าน server ของเรา: ไฟล์ใหญ่ถึง 100 MB กินหน่วยความจำ และโฮสต์อย่าง Vercel
   * รับ body ได้แค่ไม่กี่ MB ลายเซ็นล็อก public_id กับ type ไว้ ผู้ใช้จึงเลือกที่เก็บเองไม่ได้
   * และไฟล์เป็น authenticated เสมอ (เปิดด้วย URL ตรงไม่ได้ เพราะเป็นของที่ขาย)
   */
  createVideoUploadTicket(ownerId: string): VideoUploadTicket {
    const { cloud_name, api_key, api_secret } = cloudinary.config();
    const params = {
      public_id: `${LESSON_VIDEO_FOLDER}/${ownerId}/${randomUUID()}`,
      timestamp: String(Math.floor(Date.now() / 1000)),
      type: 'authenticated',
    };

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloud_name}/video/upload`,
      fields: {
        ...params,
        api_key: api_key!,
        signature: cloudinary.utils.api_sign_request(params, api_secret!),
      },
    };
  }

  /** public_id นี้มาจากใบอนุญาตที่เราออกให้ผู้สอนคนนี้หรือเปล่า */
  isVideoUploadedBy(ownerId: string, publicId: string): boolean {
    return new RegExp(`^${LESSON_VIDEO_FOLDER}/${ownerId}/${UUID}$`).test(
      publicId,
    );
  }

  /**
   * อ่านข้อมูลวิดีโอที่เบราว์เซอร์อัปโหลดไว้ (ถาม Cloudinary เอง ไม่เชื่อค่าที่หน้าเว็บส่งมา)
   * ไม่เจอ / ไม่ใช่วิดีโอ / ใหญ่เกิน = ลบทิ้งแล้วตอบ 400
   */
  async getUploadedVideo(publicId: string): Promise<CloudinaryVideoAsset> {
    let result: { secure_url?: string; duration?: unknown; bytes?: unknown };
    try {
      // media_metadata: ไม่ใส่ Cloudinary จะไม่ส่งความยาววิดีโอ (duration) มา
      result = (await cloudinary.api.resource(publicId, {
        resource_type: 'video',
        type: 'authenticated',
        media_metadata: true,
      })) as typeof result;
    } catch (error) {
      this.logger.warn(`Uploaded video ${publicId} not found`, error);
      throw new BadRequestException(
        'We could not find the uploaded video. Please upload it again.',
      );
    }

    const reject = async (message: string): Promise<never> => {
      await this.deleteAsset(publicId, 'video', 'authenticated');
      throw new BadRequestException(message);
    };

    if (typeof result.bytes !== 'number' || result.bytes > VIDEO_MAX_BYTES) {
      return reject('Video must be smaller than 100 MB');
    }

    const duration = result.duration;
    if (
      !result.secure_url ||
      typeof duration !== 'number' ||
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      return reject('This file is not a playable video');
    }

    return {
      url: result.secure_url,
      publicId,
      durationSeconds: Math.max(1, Math.round(duration)),
    };
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
