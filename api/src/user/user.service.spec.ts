import { OtpPurpose, Role } from '@/database/generated/prisma/enums';
import { BadRequestException } from '@nestjs/common';
import { UserService } from '@/user/user.service';

/** ลบบัญชีตัวเอง: ต้องยืนยันตัวตน, ข้อมูลส่วนตัวหาย, ประวัติการซื้อยังอยู่ */

const USER_ID = 'user-1';

function setup(
  user: Partial<{
    email: string;
    password: string | null;
    role: Role;
    avatarPublicId: string | null;
    avatarUrl: string | null;
    deletedAt: Date | null;
  }> = {},
  activeCourses = 0,
) {
  const op = () => jest.fn().mockResolvedValue({ count: 0 });
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        email: 'ann@test.local',
        password: 'hashed',
        role: Role.STUDENT,
        avatarPublicId: 'avatars/ann',
        avatarUrl: 'https://res.cloudinary.com/x/avatars/ann.jpg',
        deletedAt: null,
        ...user,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    course: { count: jest.fn().mockResolvedValue(activeCourses) },
    cartItem: { deleteMany: op() },
    wishlist: { deleteMany: op() },
    lessonProgress: { deleteMany: op() },
    emailVerificationToken: { deleteMany: op() },
    passwordResetToken: { deleteMany: op() },
    oneTimeCode: {
      deleteMany: op(),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    purchase: { deleteMany: op() },
    payoutAccount: { deleteMany: op() },
    refreshToken: { deleteMany: op() },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const bcrypt = {
    compare: jest.fn((plain: string) => Promise.resolve(plain === 'Correct1!')),
  };
  const cloudinary = {
    deleteAsset: jest.fn().mockResolvedValue(undefined),
    getPublicIdFromUrl: jest.fn(),
  };
  const mail = { sendOneTimeCode: jest.fn().mockResolvedValue(undefined) };
  const otp = {
    issue: jest.fn().mockResolvedValue({ id: 'challenge-1', code: '123456' }),
    isCoolingDown: jest.fn().mockReturnValue(false),
    // รหัสถูกต้อง = '123456' ของ challenge-1 (ของผู้ใช้คนนี้)
    verify: jest.fn((id: string, code: string) => {
      if (code !== '123456') {
        return Promise.reject(
          new BadRequestException({
            message: 'Incorrect code.',
            code: 'OTP_INVALID',
          }),
        );
      }
      return Promise.resolve(id === 'challenge-1' ? USER_ID : 'someone-else');
    }),
  };

  const service = new UserService(
    prisma as never,
    bcrypt as never,
    cloudinary as never,
    {} as never,
    {} as never,
    mail as never,
    {} as never,
    otp as never,
    {} as never,
  );
  return { service, prisma, cloudinary, mail, otp };
}

describe('UserService.deleteAccount', () => {
  it('removes personal data, ends sessions and keeps purchase history', async () => {
    const { service, prisma, cloudinary } = setup();

    await service.deleteAccount(USER_ID, { password: 'Correct1!' });

    const update = (prisma.user.update.mock.calls as unknown[][])[0][0] as {
      data: Record<string, unknown>;
    };
    expect(update.data).toMatchObject({
      firstName: 'Deleted',
      lastName: 'User',
      email: `deleted-${USER_ID}@deleted.invalid`,
      password: null,
      googleId: null,
      avatarUrl: null,
      bio: null,
      status: false, // AuthGuard ปฏิเสธ token ที่ค้างอยู่ทันที
    });
    expect(update.data.deletedAt).toBeInstanceOf(Date);
    expect(prisma.cartItem.deleteMany).toHaveBeenCalled();
    expect(prisma.lessonProgress.deleteMany).toHaveBeenCalled();
    // ออกจากระบบทุกเครื่อง
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
    // เลขบัญชีธนาคารรับเงินของผู้สอนถูกลบด้วย
    expect(prisma.payoutAccount.deleteMany).toHaveBeenCalledWith({
      where: { instructorId: USER_ID },
    });
    // ประวัติการซื้อต้องเก็บไว้ตามกฎหมายบัญชี
    expect(prisma.purchase.deleteMany).not.toHaveBeenCalled();
    expect(cloudinary.deleteAsset).toHaveBeenCalledWith('avatars/ann');
  });

  it('requires the correct password', async () => {
    const { service, prisma } = setup();

    await expect(
      service.deleteAccount(USER_ID, { password: 'wrong' }),
    ).rejects.toThrow('Password is incorrect');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('requires an email code for accounts without a password', async () => {
    const { service, prisma } = setup({ password: null });

    await expect(service.deleteAccount(USER_ID, {})).rejects.toThrow(
      '6-digit code',
    );
    await expect(
      service.deleteAccount(USER_ID, {
        challengeId: 'challenge-1',
        code: '000000',
      }),
    ).rejects.toThrow('Incorrect code');
    expect(prisma.user.update).not.toHaveBeenCalled();

    await service.deleteAccount(USER_ID, {
      challengeId: 'challenge-1',
      code: '123456',
    });
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it("rejects a code that belongs to someone else's challenge", async () => {
    const { service, prisma } = setup({ password: null });

    await expect(
      service.deleteAccount(USER_ID, {
        challengeId: 'challenge-of-another-user',
        code: '123456',
      }),
    ).rejects.toThrow('expired');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('blocks instructors who still have courses', async () => {
    const { service, prisma } = setup({}, 2);

    await expect(
      service.deleteAccount(USER_ID, { password: 'Correct1!' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'HAS_COURSES' }) as unknown,
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('does not let admins delete themselves', async () => {
    const { service, prisma } = setup({ role: Role.ADMIN });

    await expect(
      service.deleteAccount(USER_ID, { password: 'Correct1!' }),
    ).rejects.toThrow('super admin');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('UserService.requestDeleteAccountCode', () => {
  it('emails a delete-account code after the email is confirmed', async () => {
    const { service, mail, otp } = setup({ password: null });

    const result = await service.requestDeleteAccountCode(
      USER_ID,
      ' ANN@test.local ',
    );

    expect(otp.issue).toHaveBeenCalledWith(USER_ID, OtpPurpose.DELETE_ACCOUNT);
    expect(mail.sendOneTimeCode).toHaveBeenCalledWith(
      'ann@test.local',
      '123456',
      OtpPurpose.DELETE_ACCOUNT,
    );
    expect(result.challengeId).toBe('challenge-1');
  });

  it('refuses when the typed email is not the account email', async () => {
    const { service, mail } = setup({ password: null });

    await expect(
      service.requestDeleteAccountCode(USER_ID, 'other@test.local'),
    ).rejects.toThrow("isn't the email");
    expect(mail.sendOneTimeCode).not.toHaveBeenCalled();
  });

  it('tells password accounts to use their password', async () => {
    const { service, mail } = setup();

    await expect(
      service.requestDeleteAccountCode(USER_ID, 'ann@test.local'),
    ).rejects.toThrow('password');
    expect(mail.sendOneTimeCode).not.toHaveBeenCalled();
  });

  it('limits how often a code can be requested', async () => {
    const { service, prisma, otp, mail } = setup({ password: null });
    prisma.oneTimeCode.findFirst.mockResolvedValue({ createdAt: new Date() });
    otp.isCoolingDown.mockReturnValue(true);

    await expect(
      service.requestDeleteAccountCode(USER_ID, 'ann@test.local'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'OTP_COOLDOWN' }) as unknown,
    });
    expect(mail.sendOneTimeCode).not.toHaveBeenCalled();
  });

  it('checks for remaining courses before sending a code', async () => {
    const { service, mail } = setup({ password: null }, 1);

    await expect(
      service.requestDeleteAccountCode(USER_ID, 'ann@test.local'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'HAS_COURSES' }) as unknown,
    });
    expect(mail.sendOneTimeCode).not.toHaveBeenCalled();
  });
});

describe('UserService.becomeInstructor', () => {
  function setupInstructor(isInstructor = false) {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          email: 'ann@test.local',
          role: Role.STUDENT,
          isInstructor,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const accessToken = { sign: jest.fn().mockResolvedValue('new-token') };
    const service = new UserService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      accessToken as never,
      {} as never,
      {} as never,
    );
    return { service, prisma, accessToken };
  }

  it('refuses without accepting the instructor terms', async () => {
    const { service, prisma } = setupInstructor();

    await expect(service.becomeInstructor(USER_ID, false)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('enables teaching and records when the terms were accepted', async () => {
    const { service, prisma } = setupInstructor();

    const result = await service.becomeInstructor(USER_ID, true);

    const [[args]] = prisma.user.update.mock.calls as [
      [{ where: unknown; data: { instructorTermsAcceptedAt: unknown } }],
    ];
    expect(args.where).toEqual({ id: USER_ID });
    expect(args.data).toMatchObject({ isInstructor: true });
    expect(args.data.instructorTermsAcceptedAt).toBeInstanceOf(Date);
    expect(result.access_token).toBe('new-token');
  });

  it('does not overwrite the acceptance date for existing instructors', async () => {
    const { service, prisma } = setupInstructor(true);

    await service.becomeInstructor(USER_ID, true);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
