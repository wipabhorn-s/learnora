import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAccountController } from './admin-account.controller';

@Module({
  controllers: [AdminController, AdminAccountController],
  providers: [AdminService]
})
export class AdminModule {}
