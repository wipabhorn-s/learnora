-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension (users.email เป็น citext: อีเมลไม่สนตัวพิมพ์เล็ก/ใหญ่)
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'INSTRUCTOR', 'ADMIN', 'SUPER ADMIN');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'ENABLE_TWO_FACTOR', 'DELETE_ACCOUNT');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('PROGRAMMING', 'BUSINESS', 'DESIGN', 'MARKETING', 'PERSONAL DEVELOPMENT', 'LANGUAGE');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('LIFETIME', 'LIMITED');

-- CreateEnum
CREATE TYPE "StatusCourse" AS ENUM ('DRAFT', 'PUBLISHED', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('FREE', 'CARD', 'PROMPTPAY', 'TRUEMONEY', 'MOBILE_BANKING');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RefundRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "avatar_public_id" TEXT,
    "role" "Role" NOT NULL,
    "is_instructor" BOOLEAN NOT NULL DEFAULT false,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "email" CITEXT NOT NULL,
    "email_verified_at" TIMESTAMPTZ(2),
    "password" TEXT,
    "google_id" TEXT,
    "bio" VARCHAR(1000),
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(2),
    "created_at" TIMESTAMPTZ(2) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(2) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "pending_email" CITEXT,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(2) NOT NULL,
    "used_at" TIMESTAMPTZ(2),
    "created_at" TIMESTAMPTZ(2) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(2) NOT NULL,
    "used_at" TIMESTAMPTZ(2),
    "created_at" TIMESTAMPTZ(2) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "one_time_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(2) NOT NULL,
    "used_at" TIMESTAMPTZ(2),
    "created_at" TIMESTAMPTZ(2) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "one_time_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" SERIAL NOT NULL,
    "instructor_id" UUID NOT NULL,
    "category" "Category" NOT NULL,
    "level" "Level" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" VARCHAR(160),
    "description" TEXT NOT NULL,
    "learning_outcomes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price" DECIMAL(10,2) NOT NULL,
    "access_type" "AccessType" NOT NULL,
    "access_duration" INTEGER,
    "thumbnail_url" TEXT,
    "thumbnail_public_id" TEXT,
    "status" "StatusCourse" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(2) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(2) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlists" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "course_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(2) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "course_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(2) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "video_url" TEXT NOT NULL,
    "video_public_id" TEXT,
    "duration_seconds" INTEGER NOT NULL,
    "order_no" INTEGER NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" "PaymentMethod",
    "charge_id" TEXT,
    "cancelled_at" TIMESTAMPTZ(2),
    "manual_refund_needed" BOOLEAN NOT NULL DEFAULT false,
    "refund_reference" TEXT,
    "refunded_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "purchased_at" TIMESTAMPTZ(2),
    "created_at" TIMESTAMPTZ(2) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(2) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "course_id" INTEGER NOT NULL,
    "student_id" UUID NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "expires_at" TIMESTAMPTZ(2),
    "enrollment_status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" UUID NOT NULL,
    "purchase_item_id" UUID NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "last_position_seconds" INTEGER NOT NULL DEFAULT 0,
    "max_watched_seconds" INTEGER NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(2) NOT NULL,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" UUID NOT NULL,
    "purchase_item_id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "status" "RefundRequestStatus" NOT NULL DEFAULT 'PENDING',
    "admin_note" VARCHAR(1000),
    "refund_reference" VARCHAR(100),
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(2),
    "created_at" TIMESTAMPTZ(2) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(2) NOT NULL,

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "one_time_codes_user_id_purpose_idx" ON "one_time_codes"("user_id", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "wishlists_student_id_course_id_key" ON "wishlists"("student_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_student_id_course_id_key" ON "cart_items"("student_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_course_id_order_no_key" ON "lessons"("course_id", "order_no");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_charge_id_key" ON "purchases"("charge_id");

-- CreateIndex
CREATE INDEX "purchase_items_student_id_course_id_idx" ON "purchase_items"("student_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_items_purchase_id_course_id_key" ON "purchase_items"("purchase_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_purchase_item_id_lesson_id_key" ON "lesson_progress"("purchase_item_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "refund_requests_purchase_item_id_key" ON "refund_requests"("purchase_item_id");

-- CreateIndex
CREATE INDEX "refund_requests_status_created_at_idx" ON "refund_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "refund_requests_purchase_id_idx" ON "refund_requests"("purchase_id");

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_time_codes" ADD CONSTRAINT "one_time_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_purchase_item_id_fkey" FOREIGN KEY ("purchase_item_id") REFERENCES "purchase_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_purchase_item_id_fkey" FOREIGN KEY ("purchase_item_id") REFERENCES "purchase_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
