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

export type CloudinaryAsset = {
  url: string;
  publicId: string;
};

export type CloudinaryVideoAsset = CloudinaryAsset & {
  durationSeconds: number;
};

type CloudinaryResourceType = 'image' | 'video';

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

      const uploadMarker = `/${resourceType}/upload/`;
      const markerIndex = parsedUrl.pathname.indexOf(uploadMarker);

      if (markerIndex === -1) {
        return undefined;
      }

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
  ): Promise<void> {
    if (!publicId) {
      return;
    }

    try {
      const result: unknown = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
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
