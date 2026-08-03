import { auth } from "@/lib/auth";
import CourseCard from "@/components/features/course/CourseCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CourseApi, CourseResponse } from "@/lib/api/course.api";
import { CartApi } from "@/lib/api/cart.api";
import { WishlistApi } from "@/lib/api/wishlist.api";
import { getOwnedCourseIds, PurchaseApi } from "@/lib/api/purchase.api";
import { CATEGORY_META } from "@/lib/constants/categories";
import {
  ChevronRight,
  Clock,
  Shield,
  Smartphone,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const BENEFITS = [
  {
    icon: Shield,
    title: "Verified Instructors",
    desc: "Courses are published by instructors who teach what they actually do.",
    color: "text-purple-600 bg-purple-50",
  },
  {
    icon: Clock,
    title: "Flexible Access Plans",
    desc: "Choose lifetime access or a limited plan — whatever fits how you learn.",
    color: "text-blue-600 bg-blue-50",
  },
  {
    icon: Smartphone,
    title: "Learn Anywhere",
    desc: "Access all courses on desktop, tablet, or mobile — anytime.",
    color: "text-orange-600 bg-orange-50",
  },
  {
    icon: Users,
    title: "Learn From Real Work",
    desc: "Lessons built around practical examples, not just theory.",
    color: "text-pink-600 bg-pink-50",
  },
  {
    icon: TrendingUp,
    title: "Career Growth",
    desc: "Practical projects to help you build skills employers actually want.",
    color: "text-cyan-600 bg-cyan-50",
  },
  {
    icon: Zap,
    title: "Learn at Your Speed",
    desc: "No deadlines, no pressure. Revisit lessons as many times as you need.",
    color: "text-emerald-600 bg-emerald-50",
  },
];

export default async function HomePage() {
  const session = await auth();
  const user = session?.user;
  let latestCourses: CourseResponse[] = [];
  let cartCourseIds = new Set<number>();
  let wishlistCourseIds = new Set<number>();
  let ownedCourseIds = new Set<number>();

  try {
    const data = await CourseApi.findAll({ page: 1 });
    latestCourses = data.courses.slice(0, 3);
  } catch {}

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
    } catch {}
  }

  const viewer = !user
    ? "GUEST"
    : user.role === "STUDENT"
      ? "STUDENT"
      : "OTHER";

  return (
    <div className="bg-background">
      {/* ─── Hero ─── */}
      <section className="border-b border-border bg-white py-20">
        <div className="mx-auto grid max-w-7xl items-stretch gap-14 px-6 md:grid-cols-2">
          <div className="flex flex-col justify-center space-y-6">
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-primary/20 bg-secondary px-3 py-1.5 text-xs font-semibold text-primary shadow-sm">
              <Zap size={13} />
              Learn without limits
            </div>

            <h1 className="text-5xl font-extrabold leading-tight">
              Learn new skills,
              <br />
              <span className="text-primary">at your own pace.</span>
            </h1>

            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              Courses built by real instructors who&apos;ve done the work —
              practical lessons you can apply right away, available whenever
              your schedule allows.
            </p>

            <div className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                nativeButton={false}
                className={`h-11 w-full ${
                  session?.user ? "sm:col-span-2" : ""
                }`}
                render={
                  <Link href="/courses">
                    Explore Courses
                    <ChevronRight size={16} />
                  </Link>
                }
              />

              {!user && (
                <Button
                  nativeButton={false}
                  variant="outline"
                  className="h-11 w-full"
                  render={
                    <Link href="/signup?role=INSTRUCTOR">
                      Become an Instructor
                    </Link>
                  }
                />
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {CATEGORY_META.map((cat) => (
                <Link
                  key={cat.value}
                  href={`/courses?category=${cat.value}`}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all hover:scale-105 hover:shadow-sm ${cat.color}`}
                >
                  <cat.icon size={12} />
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden items-center md:flex">
            <div className="relative h-95 w-full overflow-hidden rounded-2xl shadow-lg">
              <Image
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=720&h=420&fit=crop&auto=format"
                alt="Students studying together with laptops"
                fill
                sizes="(max-width: 768px) 0px, 50vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Top Categories ─── */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-extrabold">Top Categories</h2>
            <p className="mt-1 text-muted-foreground">
              Explore our most popular learning tracks
            </p>
          </div>
          <Link
            href="/courses"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {CATEGORY_META.map((cat) => (
            <Link
              key={cat.value}
              href={`/courses?category=${cat.value}`}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${cat.color}`}
              >
                <cat.icon size={22} />
              </div>
              <div className="text-center text-xs font-semibold leading-tight">
                {cat.label}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Latest Courses ─── */}
      {latestCourses.length > 0 && (
        <section className="bg-muted/30 py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-extrabold">Latest Courses</h2>
                <p className="mt-1 text-muted-foreground">
                  Fresh from our instructors
                </p>
              </div>
              <Link
                href="/courses"
                className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View all <ChevronRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latestCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  viewer={viewer}
                  inCart={cartCourseIds.has(course.id)}
                  inWishlist={wishlistCourseIds.has(course.id)}
                  isOwned={ownedCourseIds.has(course.id)}
                  returnTo="/"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Benefits ─── */}
      <section
        className="py-16"
        style={{
          background:
            "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 40%, #f8f7ff 100%)",
        }}
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold">Why Choose Learnora?</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Everything you need to level up your skills, all in one place
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <Card
                key={benefit.title}
                className="bg-white/80 p-6 transition-all hover:shadow-md"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${benefit.color}`}
                >
                  <benefit.icon size={22} />
                </div>
                <h3 className="mb-2 font-bold">{benefit.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {benefit.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      {!session?.user && (
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-3xl bg-primary px-10 py-14 text-center text-white">
            <h2 className="mb-3 text-3xl font-extrabold">
              Ready to start your journey?
            </h2>

            <p className="mb-8 text-base text-white/80">
              Pick a course and start learning today.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/courses"
                className="rounded-xl bg-white px-8 py-3 font-semibold text-primary transition-all hover:bg-violet-50 hover:shadow-lg"
              >
                Explore Courses
              </Link>

              <Link
                href="/signup"
                className="rounded-xl border-2 border-white/70 px-8 py-3 font-semibold text-white transition-all hover:border-white hover:bg-white/10"
              >
                Sign Up Free
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
