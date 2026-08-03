import { AdminService } from '@/admin/admin.service';
import { CreateAdminDto } from '@/admin/dto/create-admin.dto';
import { Roles } from '@/common/decorator/roles.decorator';
import { Role } from '@/database/generated/prisma/enums';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

@Roles(Role.SUPER_ADMIN)
@Controller('admins')
export class AdminAccountController {
  constructor(private readonly adminService: AdminService) {}

  @Get('/')
  findAdmins() {
    return this.adminService.findAdmins();
  }

  @Post('/')
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.adminService.createAdmin(dto);
  }

  @Patch(':adminId/status')
  updateAdminStatus(@Param('adminId', ParseUUIDPipe) adminId: string) {
    return this.adminService.updateAdminStatus(adminId);
  }
}
