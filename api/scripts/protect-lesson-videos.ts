/**
 * ย้ายวิดีโอบทเรียนที่อัปโหลดไว้ก่อนหน้า (แบบ upload = เปิดด้วย URL ตรงได้)
 * ไปเป็นแบบ authenticated (ต้องมีลายเซ็น) แล้วอัปเดต videoUrl ในฐานข้อมูล
 *
 * รันครั้งเดียว:  pnpm videos:protect
 * ดูก่อนว่าจะย้ายอะไรบ้าง (ไม่แก้อะไร):  pnpm videos:protect --dry-run
 *
 * รันซ้ำได้ ตัวที่ย้ายแล้วจะถูกข้าม ถ้าล้มกลางทาง รันใหม่ก็ต่อจากที่ค้างได้
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '../src/database/generated/prisma/client';

const dryRun = process.argv.includes('--dry-run');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function main() {
  const lessons = await prisma.lesson.findMany({
    where: { videoUrl: { contains: '/video/upload/' } },
    select: { id: true, title: true, videoPublicId: true },
  });

  console.log(
    `${lessons.length} lesson video(s) still public${dryRun ? ' (dry run)' : ''}`,
  );

  let moved = 0;
  for (const lesson of lessons) {
    if (!lesson.videoPublicId) {
      console.warn(`- skip lesson ${lesson.id}: no videoPublicId saved`);
      continue;
    }
    if (dryRun) {
      console.log(`- would protect lesson ${lesson.id} "${lesson.title}"`);
      continue;
    }

    // rename ไปชื่อเดิมแต่เปลี่ยน type: ไฟล์เดิม ย้ายที่เก็บ ไม่ต้องอัปโหลดใหม่
    const result = (await cloudinary.uploader.rename(
      lesson.videoPublicId,
      lesson.videoPublicId,
      {
        resource_type: 'video',
        type: 'upload',
        to_type: 'authenticated',
        invalidate: true,
      },
    )) as { secure_url: string };

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { videoUrl: result.secure_url },
    });
    moved += 1;
    console.log(`- protected lesson ${lesson.id} "${lesson.title}"`);
  }

  if (!dryRun) console.log(`Done: ${moved} video(s) protected`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
