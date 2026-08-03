import { StatusCourse } from '@/database/generated/prisma/enums';
import { IsIn } from 'class-validator';

export class UpdateCourseStatusDto {
  @IsIn([StatusCourse.DRAFT, StatusCourse.PUBLISHED])
  status: StatusCourse;
}
