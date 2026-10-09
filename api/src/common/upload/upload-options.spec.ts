import { IMAGE_UPLOAD, VIDEO_UPLOAD } from '@/common/upload/upload-options';
import { BadRequestException } from '@nestjs/common';

/** เรียก fileFilter ของ multer แล้วคืนผล (ผ่าน/ไม่ผ่าน + error) */
function check(options: typeof IMAGE_UPLOAD, mimetype: string) {
  let outcome: { error: Error | null; accepted: boolean } | undefined;
  options.fileFilter!(
    {},
    { mimetype } as Express.Multer.File,
    (error: Error | null, accepted?: boolean) => {
      outcome = { error, accepted: accepted ?? false };
    },
  );
  return outcome!;
}

describe('upload options', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])(
    'accepts %s as an image',
    (mimetype) => {
      expect(check(IMAGE_UPLOAD, mimetype)).toEqual({
        error: null,
        accepted: true,
      });
    },
  );

  it.each(['image/svg+xml', 'text/html', 'application/pdf', 'video/mp4'])(
    'rejects %s as an image with a 400',
    (mimetype) => {
      const { error, accepted } = check(IMAGE_UPLOAD, mimetype);
      expect(accepted).toBe(false);
      expect(error).toBeInstanceOf(BadRequestException);
    },
  );

  it('accepts videos and rejects everything else for lessons', () => {
    expect(check(VIDEO_UPLOAD, 'video/mp4').accepted).toBe(true);
    expect(check(VIDEO_UPLOAD, 'video/quicktime').accepted).toBe(true);
    expect(check(VIDEO_UPLOAD, 'application/zip').error).toBeInstanceOf(
      BadRequestException,
    );
  });

  it('caps file size (15 MB images, 100 MB videos) so huge uploads never fill memory', () => {
    expect(IMAGE_UPLOAD.limits?.fileSize).toBe(15 * 1024 * 1024);
    expect(VIDEO_UPLOAD.limits?.fileSize).toBe(100 * 1024 * 1024);
  });
});
