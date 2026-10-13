import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { Instructor } from '@/common/decorator/instructor.decorator';
import { CreateLessonDto } from '@/lesson/dto/create-lesson.dto';
import { MoveLessonDto } from '@/lesson/dto/move-lesson.dto';
import { UpdateLessonDto } from '@/lesson/dto/update-lesson.dto';
import { LessonService } from '@/lesson/lesson.service';
import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

@Instructor()
@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  /**
   * ขอใบอนุญาตอัปโหลดวิดีโอ 1 ไฟล์ เบราว์เซอร์ส่งไฟล์ตรงไป Cloudinary
   * แล้วเอา public_id ที่ได้มาใส่ตอนสร้าง/แก้บทเรียน
   */
  @Post('video-upload')
  createVideoUpload(@CurrentUser('sub') instructorId: string) {
    return this.lessonService.createVideoUpload(instructorId);
  }

  @Post('/')
  createLesson(
    @CurrentUser('sub') instructorId: string,
    @Body() createLessonDto: CreateLessonDto,
  ) {
    return this.lessonService.createLesson(instructorId, createLessonDto);
  }

  @Patch(':lessonId')
  updateLesson(
    @CurrentUser('sub') instructorId: string,
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Body() updateLessonDto: UpdateLessonDto,
  ) {
    return this.lessonService.updateLesson(
      instructorId,
      lessonId,
      updateLessonDto,
    );
  }

  @Patch(':lessonId/move')
  moveLesson(
    @CurrentUser('sub') instructorId: string,
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Body() moveLessonDto: MoveLessonDto,
  ) {
    return this.lessonService.moveLesson(instructorId, lessonId, moveLessonDto);
  }

  @Delete(':lessonId')
  removeLesson(
    @CurrentUser('sub') instructorId: string,
    @Param('lessonId', ParseIntPipe) lessonId: number,
  ) {
    return this.lessonService.removeLesson(instructorId, lessonId);
  }
}
