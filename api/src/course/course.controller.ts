import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { Public } from '@/common/decorator/public.decorator';
import { Instructor } from '@/common/decorator/instructor.decorator';
import { CourseService } from '@/course/course.service';
import { CreateCourseDto } from '@/course/dto/create-course.dto';
import { FindCoursesDto } from '@/course/dto/find-courses.dto';
import { UpdateCourseStatusDto } from '@/course/dto/update-course-status.dto';
import { UpdateCourseDto } from '@/course/dto/update-course.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Instructor()
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Public()
  @Get()
  findAllCourses(@Query() findCoursesDto: FindCoursesDto) {
    return this.courseService.findAllCourses(findCoursesDto);
  }

  @Get('/mine')
  findMyCourses(@CurrentUser('sub') instructorId: string) {
    return this.courseService.findMyCourses(instructorId);
  }

  @Get('/mine/:courseId')
  findMyCourse(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.courseService.findMyCourse(instructorId, courseId);
  }

  @Public()
  @Get(':courseId')
  findCourse(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.courseService.findCourse(courseId);
  }

  @Post('/')
  @UseInterceptors(FileInterceptor('thumbnailUrl'))
  createCourse(
    @CurrentUser('sub') instructorId: string,
    @Body() createCourseDto: CreateCourseDto,
    @UploadedFile() thumbnailFile?: Express.Multer.File,
  ) {
    return this.courseService.createCourse(
      instructorId,
      createCourseDto,
      thumbnailFile,
    );
  }

  @Patch(':courseId')
  @UseInterceptors(FileInterceptor('thumbnailUrl'))
  updateCourse(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() updateCourseDto: UpdateCourseDto,
    @UploadedFile() thumbnailFile?: Express.Multer.File,
  ) {
    return this.courseService.updateCourse(
      instructorId,
      courseId,
      updateCourseDto,
      thumbnailFile,
    );
  }

  @Delete(':courseId')
  removeCourse(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.courseService.removeCourse(instructorId, courseId);
  }

  @Patch(':courseId/status')
  updateCourseStatus(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() updateCourseStatusDto: UpdateCourseStatusDto,
  ) {
    return this.courseService.updateCourseStatus(
      instructorId,
      courseId,
      updateCourseStatusDto,
    );
  }
}
