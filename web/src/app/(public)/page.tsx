import CourseCard from "@/components/features/course/CourseCard";
import HeroVisual from "@/components/home/HeroVisual";
import Reveal from "@/components/home/Reveal";
import WhyChooseSection from "@/components/home/WhyChooseSection";
import NightSky from "@/components/magic/NightSky";
import ShootingStars from "@/components/magic/ShootingStars";
import { Button } from "@/components/ui/button";
import { CartApi } from "@/lib/api/cart.api";
import { CourseApi, CourseResponse } from "@/lib/api/course.api";
import { getOwnedCourseIds, PurchaseApi } from "@/lib/api/purchase.api";
import { WishlistApi } from "@/lib/api/wishlist.api";
import { auth } from "@/lib/auth";
import { CATEGORY_META } from "@/lib/constants/categories";
import { ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

/** ลำดับการลอยขึ้นตอนโหลดหน้า (วินาที) */
const rise = (delay: number) =>
  ({ "--rise-delay": `${delay}s` }) as React.CSSProperties;

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

  return (
    <div className="bg-background">
      {/* ─── Hero: ฟ้ากลางคืน ออโรร่า ดาว ─── */}
      <section className="relative isolate overflow-hidden pt-20 pb-28 text-white">
        <NightSky />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 md:grid-cols-2">
          <div className="flex flex-col justify-center space-y-6">
            <div
              className="animate-rise-in inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-100 shadow-lg backdrop-blur-md"
              style={rise(0)}
            >
              <Sparkles size={13} className="text-amber-300" />
              Learn without limits
            </div>

            <h1
              className="animate-rise-in text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
              style={rise(0.1)}
            >
              Learn new skills,
              <br />
              <span className="animate-shimmer-text bg-gradient-to-r from-violet-300 via-fuchsia-300 via-40% to-amber-200 bg-clip-text text-transparent">
                at your own pace.
              </span>
            </h1>

            <p
              className="animate-rise-in max-w-md text-base leading-relaxed text-violet-100/80"
              style={rise(0.2)}
            >
              Courses built by real instructors who&apos;ve done the work —
              practical lessons you can apply right away, available whenever
              your schedule allows.
            </p>

            <div
              className="animate-rise-in grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2"
              style={rise(0.3)}
            >
              <Button
                nativeButton={false}
                className={`h-12 w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-base shadow-lg shadow-fuchsia-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-fuchsia-500/40 ${
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
                  className="h-12 w-full border-white/30 bg-white/5 text-base text-white backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/15 hover:text-white"
                  render={
                    <Link href="/signup?role=INSTRUCTOR">
                      Become an Instructor
                    </Link>
                  }
                />
              )}
            </div>
          </div>

          <div className="animate-rise-in hidden md:block" style={rise(0.35)}>
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* ─── แถบหมวดหมู่วนไม่สิ้นสุด (ซ้ำ 2 ชุดให้ต่อกันเนียน) ─── */}
      <div className="relative -mt-10 overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="animate-marquee flex w-max gap-3">
          {[
            ...CATEGORY_META,
            ...CATEGORY_META,
            ...CATEGORY_META,
            ...CATEGORY_META,
          ].map((cat, index) => (
            <Link
              key={`${cat.value}-${index}`}
              href={`/courses?category=${cat.value}`}
              // ชุดที่ซ้ำไม่ต้องให้กด Tab ผ่านซ้ำ
              tabIndex={index < CATEGORY_META.length ? undefined : -1}
              aria-hidden={index < CATEGORY_META.length ? undefined : true}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition-transform hover:scale-105 ${cat.color}`}
            >
              <cat.icon size={14} />
              {cat.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ─── Why Choose Learnora: แม่มดหันมองการ์ดที่ชี้ ─── */}
      <WhyChooseSection />

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
              {latestCourses.map((course, index) => (
                <Reveal key={course.id} delay={index * 0.1}>
                  <CourseCard
                    course={course}
                    viewer={viewer}
                    inCart={cartCourseIds.has(course.id)}
                    inWishlist={wishlistCourseIds.has(course.id)}
                    isOwned={ownedCourseIds.has(course.id)}
                    isMine={course.instructorId === user?.id}
                    returnTo="/"
                  />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── CTA ─── */}
      {!session?.user && (
        <section className="mx-auto max-w-7xl px-6 py-16">
          <Reveal className="animate-gradient-pan relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 px-10 py-14 text-center text-white shadow-2xl shadow-violet-500/30">
            {/* ดาวตกในกล่อง CTA: กล่องเล็กกว่า hero จึงให้มาถี่กว่า (ทุก ~3-8 วินาที) */}
            <ShootingStars
              stars={[
                { top: "6%", left: "38%", duration: 7, delay: 1 },
                { top: "2%", left: "78%", duration: 9.5, delay: 4 },
                { top: "28%", left: "96%", duration: 12.5, delay: 7.5 },
                { top: "12%", left: "62%", duration: 15, delay: 11 },
              ]}
            />
            {/* ประกายลอยบนพื้นไล่สี */}
            <Sparkles
              aria-hidden
              size={28}
              className="animate-float absolute top-8 left-[12%] text-amber-200/80"
            />
            <Sparkles
              aria-hidden
              size={20}
              className="animate-float absolute right-[14%] bottom-10 text-white/70"
              style={{ "--float-delay": "-2s" } as React.CSSProperties}
            />
            <h2 className="mb-3 text-3xl font-extrabold">
              Ready to start your journey?
            </h2>

            <p className="mb-8 text-base text-white/80">
              Pick a course and start learning today.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/courses"
                className="w-52 rounded-xl bg-white px-8 py-3 text-center font-semibold text-primary transition-all hover:-translate-y-0.5 hover:bg-violet-50 hover:shadow-lg"
              >
                Explore Courses
              </Link>

              <Link
                href="/signup"
                className="w-52 rounded-xl border-2 border-white/70 px-8 py-3 text-center font-semibold text-white transition-all hover:border-white hover:bg-white/10"
              >
                Sign Up Free
              </Link>
            </div>
          </Reveal>
        </section>
      )}
    </div>
  );
}
