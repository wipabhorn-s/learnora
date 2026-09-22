import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { Instructor } from '@/common/decorator/instructor.decorator';
import { CreateLessonDto } from '@/lesson/dto/create-lesson.dto';
import { MoveLessonDto } from '@/lesson/dto/move-lesson.dto';
import { UpdateLessonDto } from '@/lesson/dto/update-lesson.dto';
import { LessonService } from '@/lesson/lesson.service';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Instructor()
@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post('/')
  @UseInterceptors(FileInterceptor('videoUrl'))
  createLesson(
    @CurrentUser('sub') instructorId: string,
    @Body() createLessonDto: CreateLessonDto,
    @UploadedFile() videoFile?: Express.Multer.File,
  ) {
    if (!videoFile) {
      throw new BadRequestException('Video file is required');
    }
    return this.lessonService.createLesson(
      instructorId,
      createLessonDto,
      videoFile,
    );
  }

  @Patch(':lessonId')
  @UseInterceptors(FileInterceptor('videoUrl'))
  updateLesson(
    @CurrentUser('sub') instructorId: string,
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Body() updateLessonDto: UpdateLessonDto,
    @UploadedFile() videoFile?: Express.Multer.File,
  ) {
    return this.lessonService.updateLesson(
      instructorId,
      lessonId,
      updateLessonDto,
      videoFile,
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
