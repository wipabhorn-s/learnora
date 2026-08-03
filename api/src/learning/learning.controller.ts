import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { Roles } from '@/common/decorator/roles.decorator';
import { Role } from '@/database/generated/prisma/enums';
import { UpdateProgressDto } from '@/learning/dto/update-progress.dto';
import { FindEnrolledCoursesDto } from '@/learning/dto/find-enrolled-courses.dto';
import { LearningService } from '@/learning/learning.service';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';

@Roles(Role.STUDENT)
@Controller('my-courses')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get('/')
  findEnrolledCourses(
    @CurrentUser('sub') studentId: string,
    @Query() findEnrolledCoursesDto: FindEnrolledCoursesDto,
  ) {
    return this.learningService.findEnrolledCourses(
      studentId,
      findEnrolledCoursesDto,
    );
  }

  @Get(':courseId/player')
  getCoursePlayer(
    @CurrentUser('sub') studentId: string,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.learningService.getCoursePlayer(studentId, courseId);
  }

  @Patch('lessons/:lessonId/progress')
  updateProgress(
    @CurrentUser('sub') studentId: string,
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Body() updateProgressDto: UpdateProgressDto,
  ) {
    return this.learningService.updateProgress(
      studentId,
      lessonId,
      updateProgressDto,
    );
  }
}
