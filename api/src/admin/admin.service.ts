import { PrismaService } from '@/database/prisma.service';
import { FindUsersDto } from '@/admin/dto/find-users.dto';
import { FindAdminCoursesDto } from '@/admin/dto/find-admin-courses.dto';
import { FindPaymentsDto } from '@/admin/dto/find-payments.dto';
import {
  EnrollmentStatus,
  PaymentStatus,
  Role,
  StatusCourse,
} from '@/database/generated/prisma/enums';
import { Prisma } from '@/database/generated/prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BcryptService } from '@/infrastructure/hash/bcrypt.service';
import { CreateAdminDto } from '@/admin/dto/create-admin.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { ConflictException } from '@nestjs/common';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bcryptService: BcryptService,
  ) {}

  async getAdminDashboard() {
    const [totalStudents, totalInstructors, totalCourses, revenueAgg] =
      await Promise.all([
        this.prisma.user.count({ where: { role: Role.STUDENT } }),
        this.prisma.user.count({ where: { role: Role.INSTRUCTOR } }),
        this.prisma.course.count({
          where: { status: { not: StatusCourse.DELETED } },
        }),
        this.prisma.purchase.aggregate({
          where: { paymentStatus: PaymentStatus.SUCCESS },
          _sum: { total: true },
        }),
      ]);

    return {
      totalStudents,
      totalInstructors,
      totalCourses,
      totalRevenue: (revenueAgg._sum.total ?? new Prisma.Decimal(0)).toString(),
    };
  }

  async findUsers(dto: FindUsersDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;

    const where: Prisma.UserWhereInput = {
      role: dto.role ?? { in: [Role.STUDENT, Role.INSTRUCTOR] },
      ...(dto.search && {
        OR: [
          { firstName: { contains: dto.search, mode: 'insensitive' } },
          { lastName: { contains: dto.search, mode: 'insensitive' } },
          { email: { contains: dto.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateUserStatus(adminId: string, userId: string) {
    if (adminId === userId) {
      throw new ForbiddenException('You cannot change your own status');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Use the admin account endpoints to manage admin users',
      );
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { status: !user.status },
      select: { id: true, status: true },
    });
  }

  async findAllCourses(dto: FindAdminCoursesDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;

    const where: Prisma.CourseWhereInput = {
      status: dto.status,
      ...(dto.search && {
        title: { contains: dto.search, mode: 'insensitive' },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          status: true,
          price: true,
          createdAt: true,
          instructor: { select: { firstName: true, lastName: true } },
          _count: {
            select: {
              purchaseItems: {
                where: { purchase: { paymentStatus: PaymentStatus.SUCCESS } },
              },
            },
          },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateCourseStatus(courseId: number) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');

    if (course.status === StatusCourse.PUBLISHED) {
      return this.prisma.course.update({
        where: { id: courseId },
        data: { status: StatusCourse.SUSPENDED },
        select: { id: true, status: true },
      });
    }
    if (course.status === StatusCourse.SUSPENDED) {
      return this.prisma.course.update({
        where: { id: courseId },
        data: { status: StatusCourse.PUBLISHED },
        select: { id: true, status: true },
      });
    }

    throw new BadRequestException(
      'Only published or suspended courses can be toggled here',
    );
  }

  async findPayments(dto: FindPaymentsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const where: Prisma.PurchaseWhereInput = { paymentStatus: dto.status };

    const [items, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          total: true,
          paymentStatus: true,
          purchasedAt: true,
          createdAt: true,
          student: { select: { firstName: true, lastName: true, email: true } },
          purchaseItems: { select: { course: { select: { title: true } } } },
        },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async refundPurchase(purchaseId: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });
    if (!purchase) throw new NotFoundException('Purchase not found');
    if (purchase.paymentStatus !== PaymentStatus.SUCCESS) {
      throw new BadRequestException(
        'Only successful purchases can be refunded',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.purchaseItem.updateMany({
        where: { purchaseId },
        data: { enrollmentStatus: EnrollmentStatus.REFUNDED },
      });
      return tx.purchase.update({
        where: { id: purchaseId },
        data: { paymentStatus: PaymentStatus.REFUNDED },
      });
    });
  }

  async findAdmins() {
    return this.prisma.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async createAdmin(dto: CreateAdminDto) {
    const hashed = await this.bcryptService.hash(dto.password);

    try {
      return await this.prisma.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          password: hashed,
          role: Role.ADMIN,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
        },
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async updateAdminStatus(adminId: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (
      !admin ||
      (admin.role !== Role.ADMIN && admin.role !== Role.SUPER_ADMIN)
    ) {
      throw new NotFoundException('Admin account not found');
    }

    return this.prisma.user.update({
      where: { id: adminId },
      data: { status: !admin.status },
      select: { id: true, status: true },
    });
  }
}
