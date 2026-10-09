// api\src\app.module.ts

import { validate } from '@/config/env.validation';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CourseModule } from './course/course.module';
import { LessonModule } from './lesson/lesson.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { CartModule } from './cart/cart.module';
import { PurchaseModule } from './purchase/purchase.module';
import { LearningModule } from './learning/learning.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminModule } from './admin/admin.module';
import { PayoutModule } from './payout/payout.module';
import { HashModule } from './infrastructure/hash/hash.module';
import { JwtModule } from './infrastructure/jwt/jwt.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { UploadModule } from '@/infrastructure/upload/upload.module';
import { PaymentModule } from '@/infrastructure/payment/payment.module';
import { MailModule } from '@/infrastructure/mail/mail.module';
import { InstructorGuard } from '@/auth/guards/instructor.guard';
import { DEFAULT_THROTTLE } from '@/common/decorator/throttle.decorator';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    // จำกัดคำขอต่อ IP ทุก endpoint (endpoint ที่อ่อนไหวเข้มกว่า ดู throttle.decorator.ts)
    ThrottlerModule.forRoot({
      throttlers: [DEFAULT_THROTTLE],
      errorMessage: 'Too many requests. Please wait a minute and try again.',
    }),
    DatabaseModule,
    AuthModule,
    UserModule,
    CourseModule,
    LessonModule,
    WishlistModule,
    CartModule,
    PurchaseModule,
    LearningModule,
    DashboardModule,
    AdminModule,
    PayoutModule,
    HashModule,
    JwtModule,
    UploadModule,
    PaymentModule,
    MailModule,
  ],
  providers: [
    // ตัวแรกสุด: คำขอที่เกินโควตาถูกตัดก่อนแตะฐานข้อมูล (AuthGuard query ผู้ใช้ทุกครั้ง)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: InstructorGuard },
  ],
})
export class AppModule {}
