import { Module } from '@nestjs/common';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { InstructorController } from './instructor.controller';

@Module({
  controllers: [CourseController, InstructorController],
  providers: [CourseService],
})
export class CourseModule {}
