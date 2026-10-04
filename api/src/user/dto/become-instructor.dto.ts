import { Equals } from 'class-validator';

/** เปิดสิทธิ์สอน: ต้องติ๊กยอมรับข้อตกลงผู้สอนใน Terms of Service ก่อน */
export class BecomeInstructorDto {
  @Equals(true, {
    message: 'Please accept the instructor terms to start teaching',
  })
  acceptTerms: boolean;
}
