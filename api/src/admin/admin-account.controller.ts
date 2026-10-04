import { AdminService } from '@/admin/admin.service';
import { FindAdminsDto } from '@/admin/dto/find-admins.dto';
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
  Query,
} from '@nestjs/common';

@Roles(Role.SUPER_ADMIN)
@Controller('admins')
export class AdminAccountController {
  constructor(private readonly adminService: AdminService) {}

  @Get('/')
  findAdmins(@Query() dto: FindAdminsDto) {
    return this.adminService.findAdmins(dto.search);
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
