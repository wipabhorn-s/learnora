import NightPanel from "@/components/magic/NightPanel";
import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

/** ฟอนต์หัวกลมมน ใช้แค่ตัวเลข 404 */
const fredoka = Fredoka({ subsets: ["latin"], weight: ["700"] });

export const metadata: Metadata = {
  title: "Page not found | Learnora",
};

/**
 * หน้า 404 (ทุก URL ที่ไม่มีอยู่ และทุกหน้าที่เรียก notFound())
 *
 * แม่มดขี่ไม้กวาดลอยขึ้นลงอยู่กับที่ข้างเลข 404 (animate-broom-float ใน globals.css)
 * ผู้ใช้ที่ตั้งค่าลดการเคลื่อนไหว: แม่มดนิ่ง ดาวไม่กะพริบ
 */
export default function NotFound() {
  return (
    <NightPanel
      as="main"
      className="flex min-h-dvh flex-1 flex-col items-center justify-center px-4 py-16 text-center"
      stars={{ count: 90, seed: 404, sparkleRatio: 0.08 }}
    >
      {/* เลข 404 กับแม่มดขี่ไม้กวาดลอยอยู่ข้าง ๆ (ตัวตกแต่ง) กลับด้านรูปให้หันหน้าไปทางซ้าย เข้าหาตัวเลข */}
      <div className="relative flex items-center justify-center gap-[clamp(0.5rem,2vw,2rem)]">
        <h1
          className={`${fredoka.className} relative select-none text-[clamp(6rem,min(28vw,40dvh),20rem)] leading-none font-bold text-[#e4d7ff] [text-shadow:0_0_24px_rgb(168_85_247/0.55),0_0_64px_rgb(147_51_234/0.45)]`}
        >
          404
        </h1>

        <div
          aria-hidden
          className="pointer-events-none relative -scale-x-100 w-[clamp(8rem,min(36vw,42dvh),24rem)] shrink-0"
        >
          <Image
            src="/witch/witch-broom-cutout.webp"
            alt=""
            width={1254}
            height={1254}
            priority
            sizes="(min-width: 1080px) 384px, 36vw"
            className="animate-broom-float h-auto w-full drop-shadow-[0_16px_28px_rgb(0_0_0/0.5)]"
          />
        </div>
      </div>

      <h2 className="relative mt-6 text-2xl font-bold text-white sm:text-3xl">
        Oops! This page flew away
      </h2>
      <p className="relative mt-3 max-w-md text-sm text-purple-200/80 sm:text-base">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Let&apos;s get you back on course.
      </p>

      <Link
        href="/"
        className="relative mt-8 inline-flex items-center rounded-full bg-purple-500 px-7 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgb(168_85_247/0.5)] transition hover:-translate-y-0.5 hover:bg-purple-400 focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0716] focus-visible:outline-none"
      >
        Back to Home
      </Link>
    </NightPanel>
  );
}
