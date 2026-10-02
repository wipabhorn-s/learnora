import { Public } from '@/common/decorator/public.decorator';
import { CourseService } from '@/course/course.service';
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';

/** หน้าโปรไฟล์ผู้สอนที่ใครก็เปิดดูได้ ลิงก์มาจากชื่อผู้สอนในหน้าคอร์ส */
@Controller('instructors')
export class InstructorController {
  constructor(private readonly courseService: CourseService) {}

  @Public()
  @Get(':instructorId')
  findOne(@Param('instructorId', ParseUUIDPipe) instructorId: string) {
    return this.courseService.findInstructorProfile(instructorId);
  }
}
