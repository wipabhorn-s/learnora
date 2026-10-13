import { StatusCourse } from '@/database/generated/prisma/enums';
import { CloudinaryService } from '@/infrastructure/upload/cloudinary.service';
import { LessonService } from '@/lesson/lesson.service';
import { BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

const INSTRUCTOR = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const videoId = (owner: string) =>
  `lessons/${owner}/33333333-3333-4333-8333-333333333333`;

/** CloudinaryService ตัวจริง (ตรวจรูปแบบ public_id และลายเซ็นจริง) แต่ไม่ต่อเน็ต */
function setup() {
  const cloudinaryService = new CloudinaryService({
    get: (key: string) =>
      ({
        CLOUDINARY_CLOUD_NAME: 'demo-cloud',
        CLOUDINARY_API_KEY: '123456',
        CLOUDINARY_API_SECRET: 'test-secret',
      })[key],
  } as never);
  const getUploadedVideo = jest
    .spyOn(cloudinaryService, 'getUploadedVideo')
    .mockResolvedValue({
      url: 'https://res.cloudinary.com/demo-cloud/video/authenticated/v1/x.mp4',
      publicId: videoId(INSTRUCTOR),
      durationSeconds: 42,
    });
  const deleteAsset = jest
    .spyOn(cloudinaryService, 'deleteAsset')
    .mockResolvedValue();

  const prisma = {
    course: {
      findUnique: jest.fn(() =>
        Promise.resolve({
          id: 1,
          instructorId: INSTRUCTOR,
          status: StatusCourse.DRAFT,
        }),
      ),
    },
    lesson: {
      findFirst: jest.fn((): Promise<unknown> => Promise.resolve(null)),
      create: jest.fn(({ data }: { data: object }) =>
        Promise.resolve({ id: 9, ...data }),
      ),
    },
  };

  const service = new LessonService(prisma as never, cloudinaryService);
  return { service, prisma, cloudinaryService, getUploadedVideo, deleteAsset };
}

describe('LessonService — videos uploaded straight to Cloudinary', () => {
  it('signs an upload that only fits this instructor and is never public', () => {
    const { service } = setup();

    const { uploadUrl, fields } = service.createVideoUpload(INSTRUCTOR);

    expect(uploadUrl).toBe(
      'https://api.cloudinary.com/v1_1/demo-cloud/video/upload',
    );
    expect(fields.type).toBe('authenticated');
    expect(fields.public_id).toMatch(
      new RegExp(`^lessons/${INSTRUCTOR}/[0-9a-f-]{36}$`),
    );
    // ลายเซ็นคิดจาก public_id + timestamp + type: เปลี่ยนค่าไหน Cloudinary ก็ไม่รับ
    expect(fields.signature).toBe(
      cloudinary.utils.api_sign_request(
        {
          public_id: fields.public_id,
          timestamp: fields.timestamp,
          type: fields.type,
        },
        'test-secret',
      ),
    );
    expect(fields).not.toHaveProperty('api_secret');
  });

  it('creates the lesson from the uploaded video, using details read from Cloudinary', async () => {
    const { service, prisma, getUploadedVideo } = setup();

    await service.createLesson(INSTRUCTOR, {
      courseId: 1,
      title: 'Intro',
      videoPublicId: videoId(INSTRUCTOR),
    });

    expect(getUploadedVideo).toHaveBeenCalledWith(videoId(INSTRUCTOR));
    expect(prisma.lesson.create).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          videoPublicId: videoId(INSTRUCTOR),
          durationSeconds: 42,
          orderNo: 1,
        }),
      }),
    );
  });

  it.each([
    ["another instructor's upload", videoId(OTHER)],
    ['a file outside the lessons folder', 'samples/sea-turtle'],
    ['a path that only starts like ours', `${videoId(INSTRUCTOR)}/../x`],
  ])('rejects %s without touching Cloudinary', async (_case, videoPublicId) => {
    const { service, prisma, getUploadedVideo } = setup();

    await expect(
      service.createLesson(INSTRUCTOR, {
        courseId: 1,
        title: 'x',
        videoPublicId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(getUploadedVideo).not.toHaveBeenCalled();
    expect(prisma.lesson.create).not.toHaveBeenCalled();
  });

  it('rejects a video another lesson already uses', async () => {
    const { service, prisma, getUploadedVideo } = setup();
    prisma.lesson.findFirst.mockResolvedValue({ id: 5 });

    await expect(
      service.createLesson(INSTRUCTOR, {
        courseId: 1,
        title: 'x',
        videoPublicId: videoId(INSTRUCTOR),
      }),
    ).rejects.toThrow('already used by another lesson');
    expect(getUploadedVideo).not.toHaveBeenCalled();
  });

  it('removes the uploaded video if saving the lesson fails', async () => {
    const { service, prisma, deleteAsset } = setup();
    prisma.lesson.create.mockRejectedValue(new Error('db down'));

    await expect(
      service.createLesson(INSTRUCTOR, {
        courseId: 1,
        title: 'x',
        videoPublicId: videoId(INSTRUCTOR),
      }),
    ).rejects.toThrow('db down');
    expect(deleteAsset).toHaveBeenCalledWith(
      videoId(INSTRUCTOR),
      'video',
      'authenticated',
    );
  });
});
