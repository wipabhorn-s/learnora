import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { Instructor } from '@/common/decorator/instructor.decorator';
import { Roles } from '@/common/decorator/roles.decorator';
import { DashboardService } from '@/dashboard/dashboard.service';
import { FindStudentDashboardDto } from '@/dashboard/dto/find-student-dashboard.dto';
import { Role } from '@/database/generated/prisma/enums';
import { Controller, Get, Query } from '@nestjs/common';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles(Role.STUDENT)
  @Get('student')
  getStudentDashboard(
    @CurrentUser('sub') userId: string,
    @Query() findStudentDashboardDto: FindStudentDashboardDto,
  ) {
    return this.dashboardService.getStudentDashboard(
      userId,
      findStudentDashboardDto,
    );
  }

  @Instructor()
  @Get('instructor')
  getInstructorDashboard(@CurrentUser('sub') userId: string) {
    return this.dashboardService.getInstructorDashboard(userId);
  }
}
