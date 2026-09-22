-- ย้ายข้อมูลเดิมให้เข้ากับการแยก "สิทธิ์สอน" ออกจาก role
--
-- รันครั้งเดียวหลัง `pnpm exec prisma db push` (หรือหลัง migrate) บนฐานข้อมูล
-- ที่มีผู้ใช้อยู่แล้ว ถ้าเป็นฐานข้อมูลเปล่าไม่ต้องรัน
--
--   psql "$DATABASE_URL" -f prisma/backfill-instructor-capability.sql

BEGIN;

-- 1) ผู้สอนเดิมได้สิทธิ์สอน แล้วย้ายมาเป็นผู้ใช้ทั่วไปเหมือนคนอื่น
--    เพื่อให้ซื้อและเรียนคอร์สของคนอื่นได้ด้วย
UPDATE users SET is_instructor = true WHERE role = 'INSTRUCTOR';
UPDATE users SET role = 'STUDENT' WHERE role = 'INSTRUCTOR';

-- 2) บัญชีที่มีอยู่ก่อนระบบยืนยันอีเมลถือว่ายืนยันแล้ว ไม่งั้นทุกคนจะ
--    ล็อกอินไม่ได้ทันทีที่ deploy
UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL;

COMMIT;
