// api\src\user\types\user.type.ts

export type UserCreateInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  // ผู้สมัครกดเลือก "Register as Instructor" ไว้ตั้งแต่หน้าสมัคร
  isInstructor: boolean;
};
