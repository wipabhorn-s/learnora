import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { Roles } from '@/common/decorator/roles.decorator';
import { AdminService } from '@/admin/admin.service';
import { FindAdminCoursesDto } from '@/admin/dto/find-admin-courses.dto';
import { FindPaymentsDto } from '@/admin/dto/find-payments.dto';
import { FindUsersDto } from '@/admin/dto/find-users.dto';
import { Role } from '@/database/generated/prisma/enums';
import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';

@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getAdminDashboard() {
    return this.adminService.getAdminDashboard();
  }

  @Get('users')
  findUsers(@Query() dto: FindUsersDto) {
    return this.adminService.findUsers(dto);
  }

  @Patch('users/:userId/status')
  updateUserStatus(
    @CurrentUser('sub') adminId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.adminService.updateUserStatus(adminId, userId);
  }

  @Get('courses')
  findAllCourses(@Query() dto: FindAdminCoursesDto) {
    return this.adminService.findAllCourses(dto);
  }

  @Patch('courses/:courseId/status')
  updateCourseStatus(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.adminService.updateCourseStatus(courseId);
  }

  @Get('payments')
  findPayments(@Query() dto: FindPaymentsDto) {
    return this.adminService.findPayments(dto);
  }

  @Post('payments/:purchaseId/refund')
  refundPurchase(@Param('purchaseId', ParseUUIDPipe) purchaseId: string) {
    return this.adminService.refundPurchase(purchaseId);
  }
}
