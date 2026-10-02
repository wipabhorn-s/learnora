import CourseThumbnail from "@/components/shared/CourseThumbnail";
import ExpandableText from "@/components/shared/ExpandableText";
import ToastFromUrl from "@/components/shared/ToastFromUrl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  addToCartAction,
  removeFromCartAction,
} from "@/lib/actions/cart.actions";
import { enrollFreeAction } from "@/lib/actions/purchase.action";
import {
  addToWishlistAction,
  removeFromWishlistAction,
} from "@/lib/actions/wishlist.action";
import { ApiError } from "@/lib/api/api-error";
import { CartApi } from "@/lib/api/cart.api";
import { CourseApi } from "@/lib/api/course.api";
import { getOwnedCourseIds, PurchaseApi } from "@/lib/api/purchase.api";
import { WishlistApi } from "@/lib/api/wishlist.api";
import { auth } from "@/lib/auth";
import {
  formatClock,
  formatCount,
  formatEnum,
  formatMonth,
  formatPrice,
  fullName,
} from "@/lib/format";
import { formatDuration } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarClock,
  Check,
  ChevronRight,
  Clock,
  GraduationCap,
  Heart,
  Infinity as InfinityIcon,
  Lock,
  Pencil,
  PlayCircle,
  RefreshCw,
  ShoppingCart,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId: courseIdParam } = await params;
  const courseId = Number(courseIdParam);

  if (!Number.isInteger(courseId)) notFound();

  let course;
  try {
    course = await CourseApi.findOne(courseId);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }

  const session = await auth();
  const isStudent = session?.user.role === "STUDENT";
  // ผู้สอนก็เป็นนักเรียนได้ (บัญชีเดียวกัน) คอร์สตัวเองซื้อไม่ได้
  const isMine = course.instructorId === session?.user.id;
  let inWishlist = false;
  let inCart = false;
  let isOwned = false;

  if (session && isStudent) {
    const [wishlist, cart, purchases] = await Promise.all([
      WishlistApi.findCourseIds(session.user.access_token),
      CartApi.findAll(session.user.access_token),
      PurchaseApi.findAll(session.user.access_token),
    ]);
    inWishlist = wishlist.includes(courseId);
    inCart = cart.items.some((item) => item.course.id === courseId);
    isOwned = getOwnedCourseIds(purchases).has(courseId);
  }

  const isFree = Number(course.price) === 0;
  const totalSeconds = course.lessons.reduce(
    (sum, lesson) => sum + lesson.durationSeconds,
    0,
  );
  const lessonCount = formatCount(course.lessons.length, "lesson");
  const access =
    course.accessType === "LIFETIME"
      ? "Lifetime access"
      : `${course.accessDuration}-day access`;
  const instructorName = fullName(course.instructor);
  const currentPath = `/courses/${courseId}`;
  const instructorPath = `/instructors/${course.instructorId}`;
  // ดูบทเรียนได้แล้ว (ซื้อแล้ว หรือเป็นคอร์สของตัวเอง) ไม่ต้องแสดงกุญแจ
  const canWatch = isOwned || isMine;
  // แอดมินดูได้แต่ซื้อไม่ได้ จึงไม่มีปุ่ม
  const canAct = !session || isStudent;
  const showWishlist = !isOwned && !isMine && canAct;

  // shrink: Button ตั้ง shrink-0 ไว้ ถ้าปุ่มหลักเป็นลิงก์ (ไม่มี form ห่อ)
  // จะไม่ยอมหดและดันปุ่ม wishlist ล้นออกนอกการ์ด
  const actionClass = "h-12 w-full shrink rounded-xl text-base font-bold";

  /** ปุ่มหลักตามสถานะ ใช้ทั้งในกล่องซื้อและแถบล่างจอบนมือถือ */
  const primaryAction = !canAct ? null : !session ? (
    <Button
      nativeButton={false}
      className={actionClass}
      render={
        <Link href="/login">
          {isFree ? <GraduationCap size={19} /> : <ShoppingCart size={19} />}
          {isFree ? "Enroll for free" : "Add to cart"}
        </Link>
      }
    />
  ) : isMine ? (
    <Button
      nativeButton={false}
      variant="outline"
      className={actionClass}
      render={
        <Link href={`/instructor/courses/${courseId}/edit`}>
          <Pencil size={19} />
          Manage your course
        </Link>
      }
    />
  ) : isOwned ? (
    <Button
      nativeButton={false}
      className={actionClass}
      render={
        <Link href={`/my-courses/${courseId}/player`}>
          <PlayCircle size={19} />
          Go to course
        </Link>
      }
    />
  ) : isFree ? (
    <form action={enrollFreeAction.bind(null, courseId)} className="w-full">
      <Button type="submit" className={actionClass}>
        <GraduationCap size={19} />
        Enroll for free
      </Button>
    </form>
  ) : inCart ? (
    <Button
      nativeButton={false}
      className={actionClass}
      render={
        <Link href="/cart">
          <ShoppingCart size={19} />
          Go to cart
        </Link>
      }
    />
  ) : (
    <form
      action={addToCartAction.bind(null, courseId, currentPath)}
      className="w-full"
    >
      <Button type="submit" className={actionClass}>
        <ShoppingCart size={19} />
        Add to cart
      </Button>
    </form>
  );

  const wishlistLabel = inWishlist ? "Remove from wishlist" : "Add to wishlist";
  const wishlistButton = showWishlist && (
    <Button
      type={session ? "submit" : "button"}
      variant="outline"
      size="icon"
      aria-label={wishlistLabel}
      title={wishlistLabel}
      className="size-12 shrink-0 rounded-xl"
      {...(!session && {
        nativeButton: false,
        render: <Link href="/login" />,
      })}
    >
      <Heart
        size={20}
        className={inWishlist ? "fill-red-500 text-red-500" : ""}
      />
    </Button>
  );

  // แถวข้อมูลย่อในหัวคอร์ส ให้เห็นภาพรวมก่อนเลื่อนลงไปอ่าน
  const meta: { icon: LucideIcon; label: string }[] = [
    { icon: BarChart3, label: formatEnum(course.level) },
    {
      icon: PlayCircle,
      label: `${lessonCount} · ${formatDuration(totalSeconds)}`,
    },
    {
      icon: Users,
      // 0 คนดูไม่น่าเชื่อถือ บอกว่าเป็นคอร์สใหม่แทน
      label:
        course.studentCount > 0
          ? formatCount(course.studentCount, "student")
          : "New course",
    },
    { icon: RefreshCw, label: `Updated ${formatMonth(course.updatedAt)}` },
  ];

  const instructorStats = [
    formatCount(course.instructor.courseCount, "course"),
    formatCount(course.instructor.studentCount, "student"),
  ];

  const includes: { icon: LucideIcon; label: string }[] = [
    {
      icon: PlayCircle,
      label: `${lessonCount} · ${formatDuration(totalSeconds)}`,
    },
    {
      icon: course.accessType === "LIFETIME" ? InfinityIcon : CalendarClock,
      label: access,
    },
    { icon: BarChart3, label: `${formatEnum(course.level)} level` },
    { icon: Clock, label: "Learn at your own pace" },
  ];

  return (
    // overflow-x-clip: แถบสีเข้มของหัวคอร์สยื่นออกไปเกินขอบจอทั้งสองข้าง ตัดทิ้งไม่ให้เลื่อนแนวนอน
    <div className="overflow-x-clip">
      {/*
      แถวบนของ grid = หัวคอร์ส (มีแถบสีเข้มเต็มจอเป็นพื้นหลัง) แถวล่าง = เนื้อหา
      grid-rows-[auto_1fr]: กล่องซื้อที่คร่อม 2 แถวจะดันความสูงส่วนเกินไปที่แถวล่าง
      ไม่ใช่แถวหัวคอร์ส (เดิมเกิดช่องว่างใหญ่ใต้หัวคอร์ส)
      ที่ว่างให้แถบซื้อบนมือถืออยู่ที่ Footer (ดู data-sticky-cta)
    */}
      <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-8 px-6 pb-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_1fr]">
        <ToastFromUrl params={["cartError", "wishlistError"]} />

        {/* ---- หัวคอร์ส ---- */}
        <header className="relative isolate min-w-0 space-y-4 py-10 text-white before:absolute before:-inset-x-[100vw] before:inset-y-0 before:-z-10 before:bg-foreground">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1 text-sm text-white/60"
          >
            <Link href="/courses" className="hover:text-white">
              Courses
            </Link>
            <ChevronRight size={14} />
            <Link
              href={`/courses?category=${course.category}`}
              className="hover:text-white"
            >
              {formatEnum(course.category)}
            </Link>
          </nav>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {course.title}
          </h1>
          {/* สรุปสั้น ๆ พอ คำอธิบายเต็มอยู่ใน About this course ด้านล่าง
              max-w-2xl คุมความยาวบรรทัดให้อ่านสบาย */}
          <p className="line-clamp-2 max-w-2xl text-lg text-white/80">
            {course.subtitle ?? course.description}
          </p>

          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
            {meta.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-1.5">
                <Icon size={16} className="shrink-0 text-white/60" />
                {label}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3 pt-1">
            <Avatar>
              {course.instructor.avatarUrl && (
                <AvatarImage src={course.instructor.avatarUrl} alt="" />
              )}
              <AvatarFallback>{course.instructor.firstName[0]}</AvatarFallback>
            </Avatar>
            <p className="text-sm text-white/70">
              Created by{" "}
              <Link
                href={instructorPath}
                className="font-semibold text-white underline-offset-4 hover:underline"
              >
                {instructorName}
              </Link>
            </p>
          </div>
        </header>

        {/* ---- กล่องซื้อ: มือถืออยู่ต่อจากหัวคอร์ส จอใหญ่อยู่ขวาและติดอยู่กับที่ ---- */}
        <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pt-8">
          <Card className="gap-0 overflow-hidden py-0 lg:sticky lg:top-24">
            <CourseThumbnail
              src={course.thumbnailUrl}
              alt={course.title}
              sizes="(min-width: 1024px) 352px, 100vw"
              className="aspect-video w-full"
            />

            <div className="space-y-5 p-6">
              <p className="text-3xl font-extrabold tracking-tight">
                {formatPrice(course.price)}
              </p>

              {(primaryAction || wishlistButton) && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    {primaryAction}
                    {wishlistButton &&
                      (session ? (
                        <form
                          action={(inWishlist
                            ? removeFromWishlistAction
                            : addToWishlistAction
                          ).bind(null, courseId, currentPath)}
                        >
                          {wishlistButton}
                        </form>
                      ) : (
                        wishlistButton
                      ))}
                  </div>

                  {inCart && !isOwned && !isMine && (
                    <form
                      action={removeFromCartAction.bind(
                        null,
                        courseId,
                        currentPath,
                      )}
                      className="text-center"
                    >
                      <button
                        type="submit"
                        className="text-sm font-medium text-muted-foreground hover:text-destructive"
                      >
                        Remove from cart
                      </button>
                    </form>
                  )}
                </div>
              )}

              <div>
                <h2 className="mb-3 text-sm font-bold">This course includes</h2>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  {includes.map(({ icon: Icon, label }) => (
                    <li key={label} className="flex items-center gap-2.5">
                      <Icon size={16} className="shrink-0 text-primary" />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </aside>

        {/* ---- เนื้อหา ---- */}
        <div className="min-w-0 space-y-6">
          {course.learningOutcomes.length > 0 && (
            <Card className="gap-4 p-6">
              <h2 className="text-xl font-bold">{"What you'll learn"}</h2>
              <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {course.learningOutcomes.map((outcome) => (
                  <li key={outcome} className="flex gap-2.5 text-sm">
                    <Check
                      size={18}
                      className="mt-px shrink-0 text-primary"
                      aria-hidden
                    />
                    {outcome}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="gap-4 p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold">Curriculum</h2>
              <p className="text-sm text-muted-foreground">
                {lessonCount} · {formatDuration(totalSeconds)} total
              </p>
            </div>

            {course.lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No lessons published yet.
              </p>
            ) : (
              <ol className="divide-y rounded-xl border">
                {course.lessons.map((lesson, index) => (
                  <li
                    key={lesson.id}
                    className="flex items-center gap-4 px-4 py-3"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {lesson.title}
                    </span>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {formatClock(lesson.durationSeconds)}
                    </span>
                    {canWatch ? (
                      <PlayCircle
                        size={16}
                        className="shrink-0 text-primary"
                        aria-label="Available"
                      />
                    ) : (
                      <Lock
                        size={16}
                        className="shrink-0 text-muted-foreground"
                        aria-label="Locked until you enroll"
                      />
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {course.requirements.length > 0 && (
            <Card className="gap-4 p-6">
              <h2 className="text-xl font-bold">Requirements</h2>
              <ul className="list-disc space-y-2 pl-5 text-sm marker:text-primary">
                {course.requirements.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="gap-4 p-6">
            <h2 className="text-xl font-bold">About this course</h2>
            <ExpandableText
              text={course.description}
              className="text-sm leading-relaxed text-muted-foreground"
            />
          </Card>

          <Card id="instructor" className="scroll-mt-24 gap-4 p-6">
            <h2 className="text-xl font-bold">About the instructor</h2>
            <div className="flex items-center gap-4">
              <Avatar className="size-16 text-xl">
                {course.instructor.avatarUrl && (
                  <AvatarImage src={course.instructor.avatarUrl} alt="" />
                )}
                <AvatarFallback>
                  {course.instructor.firstName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <Link
                  href={instructorPath}
                  className="text-lg font-bold hover:text-primary hover:underline"
                >
                  {instructorName}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {instructorStats.join(" · ")}
                </p>
              </div>
            </div>
            {course.instructor.bio && (
              <ExpandableText
                text={course.instructor.bio}
                className="text-sm leading-relaxed text-muted-foreground"
              />
            )}
          </Card>
        </div>

        {/* ---- มือถือ: ราคา + ปุ่มหลักติดขอบล่างจอตลอด ไม่ต้องเลื่อนหาปุ่มซื้อ ---- */}
        {primaryAction && (
          <div
            data-sticky-cta
            className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-4 border-t bg-card px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden"
          >
            <p className="shrink-0 text-xl font-extrabold">
              {formatPrice(course.price)}
            </p>
            <div className="min-w-0 flex-1">{primaryAction}</div>
          </div>
        )}
      </div>
    </div>
  );
}
