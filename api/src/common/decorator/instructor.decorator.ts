// api\src\common\decorator\instructor.decorator.ts

import { SetMetadata } from '@nestjs/common';

export const IS_INSTRUCTOR_KEY = 'IS_INSTRUCTOR';

/**
 * ใช้กับ endpoint ฝั่งสอน แทน @Roles(Role.INSTRUCTOR) เดิม
 * เพราะสิทธิ์สอนย้ายไปอยู่ที่ User.isInstructor ไม่ใช่ role แล้ว
 */
export function Instructor() {
  return SetMetadata(IS_INSTRUCTOR_KEY, true);
}
