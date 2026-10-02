import CourseCard from "@/components/features/course/CourseCard";
import ExpandableText from "@/components/shared/ExpandableText";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api/api-error";
import { CartApi } from "@/lib/api/cart.api";
import { CourseApi } from "@/lib/api/course.api";
import { getOwnedCourseIds, PurchaseApi } from "@/lib/api/purchase.api";
import { WishlistApi } from "@/lib/api/wishlist.api";
import { auth } from "@/lib/auth";
import { formatCount, fullName } from "@/lib/format";
import { BookOpen, Users } from "lucide-react";
import { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";

async function getInstructor(instructorId: string) {
  try {
    return await CourseApi.findInstructor(instructorId);
  } catch (error) {
    // id ผิดรูปแบบ (400) หรือไม่ใช่ผู้สอน (404) ถือว่าไม่พบเหมือนกัน
    if (
      error instanceof ApiError &&
      (error.statusCode === 404 || error.statusCode === 400)
    ) {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ instructorId: string }>;
}): Promise<Metadata> {
  const instructor = await getInstructor((await params).instructorId);
  return {
    title: `${fullName(instructor)} | Learnora`,
  };
}

export default async function InstructorPage({
  params,
}: {
  params: Promise<{ instructorId: string }>;
}) {
  const { instructorId } = await params;
  const instructor = await getInstructor(instructorId);

  const session = await auth();
  const user = session?.user;
  let cartCourseIds = new Set<number>();
  let wishlistCourseIds = new Set<number>();
  let ownedCourseIds = new Set<number>();

  if (user?.role === "STUDENT") {
    try {
      const [cart, wishlist, purchases] = await Promise.all([
        CartApi.findAll(user.access_token),
        WishlistApi.findCourseIds(user.access_token),
        PurchaseApi.findAll(user.access_token),
      ]);
      cartCourseIds = new Set(cart.items.map((item) => item.course.id));
      wishlistCourseIds = new Set(wishlist);
      ownedCourseIds = getOwnedCourseIds(purchases);
    } catch (error) {
      // session ใช้ไม่ได้แล้ว apiFetch จะ redirect ไปล็อกเอาต์ ห้ามกลืนไว้
      unstable_rethrow(error);
    }
  }

  const viewer = !user
    ? "GUEST"
    : user.role === "STUDENT"
      ? "STUDENT"
      : "OTHER";
  const name = fullName(instructor);
  const returnTo = `/instructors/${instructorId}`;

  const stats = [
    { icon: BookOpen, label: formatCount(instructor.courseCount, "course") },
    { icon: Users, label: formatCount(instructor.studentCount, "student") },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-6 py-10">
      <Card className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:p-8">
        <Avatar className="size-24 shrink-0 text-3xl">
          {instructor.avatarUrl && (
            <AvatarImage src={instructor.avatarUrl} alt="" />
          )}
          <AvatarFallback className="bg-primary font-extrabold text-white">
            {instructor.firstName[0]}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-semibold text-primary">Instructor</p>
            <h1 className="text-3xl font-extrabold tracking-tight">{name}</h1>
          </div>

          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {stats.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-1.5">
                <Icon size={16} className="shrink-0 text-primary" />
                {label}
              </li>
            ))}
          </ul>

          {instructor.bio && (
            <ExpandableText
              text={instructor.bio}
              className="text-sm leading-relaxed text-muted-foreground"
            />
          )}
        </div>
      </Card>

      <section className="space-y-5">
        <h2 className="text-xl font-bold">Courses by {instructor.firstName}</h2>

        {instructor.courses.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {instructor.courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                compact
                viewer={viewer}
                inCart={cartCourseIds.has(course.id)}
                inWishlist={wishlistCourseIds.has(course.id)}
                isOwned={ownedCourseIds.has(course.id)}
                isMine={course.instructorId === user?.id}
                returnTo={returnTo}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No published courses yet.
          </p>
        )}
      </section>
    </div>
  );
}
