"use client";

import Reveal from "@/components/home/Reveal";
import {
  IDLE_FRAMES,
  type IdleFrame,
  useWitchIdle,
} from "@/components/home/useWitchIdle";
import NightPanel from "@/components/magic/NightPanel";
import PortraitFrame from "@/components/magic/PortraitFrame";
import SparkleStar from "@/components/magic/SparkleStar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * ทิศที่แม่มดมอง ตรงกับชื่อไฟล์ใน /public/witch/
 * (ทิศจากมุมมองคนดูจอ: upper-left = มองขึ้นไปทางซ้ายของจอ)
 */
type Direction =
  | "front"
  | "upper-left"
  | "left"
  | "lower-left"
  | "upper-right"
  | "right"
  | "lower-right";

const DIRECTIONS: Direction[] = [
  "front",
  "upper-left",
  "left",
  "lower-left",
  "upper-right",
  "right",
  "lower-right",
];

type Benefit = {
  title: string;
  desc: string;
  /** ตำแหน่งการ์ดเทียบกับแม่มด = ทิศที่แม่มดจะหันไปมอง */
  look: Direction;
};

/** 3 ใบแรกอยู่คอลัมน์ซ้าย (บน กลาง ล่าง) 3 ใบหลังอยู่คอลัมน์ขวา */
const BENEFITS: Benefit[] = [
  {
    title: "Verified Instructors",
    desc: "Courses are published by instructors who teach what they actually do.",
    look: "upper-left",
  },
  {
    title: "Flexible Access Plans",
    desc: "Choose lifetime access or a limited plan — whatever fits how you learn.",
    look: "left",
  },
  {
    title: "Learn Anywhere",
    desc: "Access all courses on desktop, tablet, or mobile — anytime.",
    look: "lower-left",
  },
  {
    title: "Learn From Real Work",
    desc: "Lessons built around practical examples, not just theory.",
    look: "upper-right",
  },
  {
    title: "Career Growth",
    desc: "Practical projects to help you build skills employers actually want.",
    look: "right",
  },
  {
    title: "Learn at Your Speed",
    desc: "No deadlines, no pressure. Revisit lessons as many times as you need.",
    look: "lower-right",
  },
];

/**
 * ดาวระยิบที่โผล่ตอนชี้การ์ด (ตำแหน่งเป็น % ของการ์ด)
 * จังหวะ (delay/duration) ไม่เท่ากัน ดาวจึงกระพริบสลับกันไม่พร้อมกัน
 */
const SPARKLES = [
  { top: "12%", left: "8%", size: 14, delay: 0, duration: 1.4 },
  { top: "18%", left: "88%", size: 18, delay: 0.3, duration: 1.6 },
  { top: "70%", left: "93%", size: 12, delay: 0.6, duration: 1.3 },
  { top: "82%", left: "14%", size: 16, delay: 0.15, duration: 1.7 },
  { top: "45%", left: "97%", size: 10, delay: 0.9, duration: 1.2 },
  { top: "6%", left: "55%", size: 11, delay: 0.45, duration: 1.5 },
];

/**
 * จังหวะการหัน (มิลลิวินาที)
 * - เปลี่ยนจากการ์ดไปการ์ด: จางสั้น ๆ ดูเหมือนหันทันที
 * - ไม่ได้ชี้การ์ดไหนแล้ว: รอแป๊บหนึ่ง แล้วค่อย ๆ จางกลับหน้าตรงช้า ๆ ให้ดูสมูท
 */
const SWITCH_FADE_MS = 150;
const RETURN_DELAY_MS = 600;
const RETURN_FADE_MS = 500;

export default function WhyChooseSection() {
  const [direction, setDirection] = useState<Direction>("front");
  // true = กำลังค่อย ๆ หันกลับหน้าตรง (ใช้การจางแบบช้า) false = หันไปมองการ์ด (จางเร็ว)
  const [returning, setReturning] = useState(false);
  // id ของตัวนับถอยหลังก่อนหันกลับ เก็บใน ref เพราะเปลี่ยนแล้วไม่ต้อง re-render
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // useCallback: ใช้แค่ ref กับ setState ซึ่งคงที่ ฟังก์ชันจึงไม่ต้องสร้างใหม่ทุก render
  // (ต้องคงที่เพราะ useEffect ด้านล่างใช้ฟังก์ชันพวกนี้)
  const cancelReturn = useCallback(() => {
    if (returnTimer.current) clearTimeout(returnTimer.current);
    returnTimer.current = null;
  }, []);

  /**
   * ── หันไปมองการ์ด ──
   * ยกเลิกการหันกลับที่รออยู่ก่อนเสมอ ไม่งั้นถ้าเลื่อนจากการ์ดใบหนึ่งไปอีกใบ
   * ตัวนับของใบแรกจะดึงแม่มดกลับหน้าตรงกลางคัน แล้วสลับรูปทันที (จางเร็ว)
   */
  const lookAt = (look: Direction) => {
    cancelReturn();
    setReturning(false);
    setDirection(look);
  };

  /**
   * ── เลิกชี้การ์ด ──
   * ยังไม่หันกลับทันที รอ RETURN_DELAY_MS ก่อน
   * - ถ้าระหว่างรอไปชี้การ์ดใบอื่น: lookAt ยกเลิกตัวนับนี้ แม่มดหันไปการ์ดใหม่เลย
   * - ถ้าครบเวลาโดยไม่มีการ์ดไหนถูกชี้: ค่อย ๆ จางกลับหน้าตรง (จางช้า)
   */
  const returnToFront = useCallback(() => {
    cancelReturn();
    returnTimer.current = setTimeout(() => {
      setReturning(true);
      setDirection("front");
      // จางกลับหน้าตรงเสร็จแล้ว เฟรมยิ้ม/กะพริบตาที่ตามมาใช้การจางสั้นตามปกติ
      returnTimer.current = setTimeout(
        () => setReturning(false),
        RETURN_FADE_MS,
      );
    }, RETURN_DELAY_MS);
  }, [cancelReturn]);

  // ออกจากหน้าไประหว่างรออยู่ ยกเลิกตัวนับ ไม่ให้ไป setState หลัง unmount
  useEffect(() => cancelReturn, [cancelReturn]);

  /**
   * จอสัมผัสไม่มี "ชี้ค้าง" — แตะแล้วยกนิ้วจะได้ pointerleave ทันที
   * ถ้าหันกลับทันทีแบบเมาส์ จะไม่เห็นแม่มดหันไปมองเลย
   * บนจอสัมผัสจึงให้มองการ์ดที่แตะค้างไว้ จนกว่าจะแตะการ์ดอื่นหรือแตะที่ว่าง
   * ตัวนี้ฟังการแตะทั้งหน้า: แตะนอกการ์ด = หันกลับมาหน้าตรง
   */
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const onCard = (event.target as Element | null)?.closest(
        "[data-witch-card]",
      );
      if (!onCard) returnToFront();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [returnToFront]);

  /**
   * handler ของการ์ดแต่ละใบ:
   * - เมาส์ / ปากกา: เข้า → หันไปมองทันที, ออก → รอแป๊บแล้วค่อย ๆ หันกลับหน้าตรง
   * - นิ้ว (touch): ข้าม pointerleave (เหตุผลอยู่ด้านบน) ใช้ onClick ตอนแตะแทน
   * - คีย์บอร์ด: focus → หันไปมอง, blur → ค่อย ๆ หันกลับหน้าตรง
   */
  const cardHandlers = (look: Direction) => ({
    onPointerEnter: (event: React.PointerEvent) => {
      if (event.pointerType !== "touch") lookAt(look);
    },
    onPointerLeave: (event: React.PointerEvent) => {
      if (event.pointerType !== "touch") returnToFront();
    },
    onClick: () => lookAt(look),
    onFocus: () => lookAt(look),
    onBlur: returnToFront,
  });

  const renderCard = (benefit: Benefit, index: number) => (
    <Reveal key={benefit.title} delay={(index % 3) * 0.1}>
      <Card
        tabIndex={0}
        data-witch-card
        // การ์ดที่แม่มดกำลังมอง (ใช้กับจอสัมผัสที่ไม่มี :hover ค้าง)
        data-active={direction === benefit.look}
        {...cardHandlers(benefit.look)}
        // ชี้แล้ว: ดาวระยิบ + ยกตัวขึ้นพร้อมเงา (hover lift / elevation) เงาดำ (พื้นหลังมืด) ไม่เปลี่ยนสีการ์ด
        // data-active ใช้กับจอสัมผัสที่ไม่มี :hover ค้าง, วง focus มีไว้ให้คนใช้คีย์บอร์ด
        className="magic-card h-full cursor-default gap-1.5 bg-white/95 p-5 backdrop-blur transition-[translate,box-shadow] duration-300 ease-out outline-none hover:-translate-y-1.5 hover:shadow-[0_18px_40px_-14px_rgb(0_0_0/0.6)] focus-visible:ring-3 focus-visible:ring-ring/50 data-[active=true]:-translate-y-1.5 data-[active=true]:shadow-[0_18px_40px_-14px_rgb(0_0_0/0.6)] motion-reduce:transition-none"
      >
        {SPARKLES.map((sparkle, sparkleIndex) => (
          <span
            key={sparkleIndex}
            aria-hidden
            className="magic-sparkle"
            style={
              {
                top: sparkle.top,
                left: sparkle.left,
                "--sparkle-delay": `${sparkle.delay}s`,
                "--sparkle-duration": `${sparkle.duration}s`,
              } as React.CSSProperties
            }
          >
            <SparkleStar size={sparkle.size} />
          </span>
        ))}
        <h3 className="font-bold">{benefit.title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {benefit.desc}
        </p>
      </Card>
    </Reveal>
  );

  return (
    // สูงเต็มจอพอดี (ลบแถบเมนู h-16 = 4rem) เลื่อนมาถึงแล้วไม่เห็น section ถัดไป
    // dvh = ความสูงจอจริงบนมือถือ (ไม่รวมแถบที่อยู่ของเบราว์เซอร์ที่ยุบ/ขยายได้)
    // ดาวหลายสีกระพริบระยิบ ผสมดาว 4 แฉกบางดวง (พื้นม่วงสว่างกว่าหน้าอื่นเล็กน้อย)
    <NightPanel
      as="section"
      className="flex min-h-[calc(100dvh-4rem)] items-center bg-[radial-gradient(ellipse_at_center,#2e1065_0%,#1a1033_55%,#0b0718_100%)] py-12"
      stars={{
        count: 120,
        seed: 7,
        colors: ["#ffffff", "#fde68a", "#f9a8d4", "#c4b5fd", "#a5f3fc"],
        sparkleRatio: 0.12,
      }}
    >
      <div className="relative mx-auto w-full max-w-7xl px-6">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">
            Why Choose Learnora?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-violet-100/75">
            Everything you need to level up your skills, all in one place
          </p>
        </div>

        {/* จอใหญ่: การ์ดซ้าย | แม่มด | การ์ดขวา  จอเล็ก: แม่มดอยู่บน การ์ดเรียงลงมา */}
        <div className="grid items-center gap-4 lg:grid-cols-[1fr_minmax(0,20rem)_1fr] lg:gap-8">
          <div className="flex justify-center lg:order-2">
            <Witch
              direction={direction}
              // หน้าตรงตามปกติ: ไม่ส่ง ใช้เวลาจางของแต่ละเฟรมกะพริบตา (BLINK_STEPS)
              fadeMs={
                direction !== "front"
                  ? SWITCH_FADE_MS
                  : returning
                    ? RETURN_FADE_MS
                    : undefined
              }
            />
          </div>
          <div className="grid gap-4 lg:order-1">
            {BENEFITS.slice(0, 3).map((benefit, index) =>
              renderCard(benefit, index),
            )}
          </div>
          <div className="grid gap-4 lg:order-3">
            {BENEFITS.slice(3).map((benefit, index) =>
              renderCard(benefit, index + 3),
            )}
          </div>
        </div>
      </div>
    </NightPanel>
  );
}

/**
 * แม่มด: วางรูปทั้ง 7 ทิศซ้อนกันในกรอบเดียว แล้วสลับแค่ opacity
 * - ไม่ต้องโหลดรูปใหม่ตอนสลับ เพราะทุกรูปอยู่ในหน้าแล้ว จึงไม่กระพริบ (ถือเป็นการ preload)
 * - รูปใหม่จางเข้าทับรูปเก่า (รายละเอียดที่ under ด้านล่าง)
 *   ความเร็วการจางมาจาก fadeMs: เร็วตอนเปลี่ยนการ์ด ช้าตอนหันกลับหน้าตรง
 *   ไม่ส่งมา = ใช้เวลาจางของแต่ละเฟรมกะพริบตา
 * - next/image ย่อจากไฟล์ต้นฉบับ (~2 MB ต่อรูป) เหลือขนาดที่จอใช้จริง และแปลงเป็น WebP/AVIF
 */
/**
 * รูปที่ซ้อนทับอยู่บน front.png: เฟรมกะพริบตา + 6 ทิศ (ตอนมองการ์ด)
 * front.png เองเป็นฐานด้านล่างที่ทึบตลอด ไม่อยู่ในรายการนี้
 */
const OVERLAY_FRAMES: (IdleFrame | Direction)[] = [
  ...IDLE_FRAMES.filter((frame) => frame !== "front"),
  ...DIRECTIONS.filter((look) => look !== "front"),
];

function Witch({
  direction,
  fadeMs,
}: {
  direction: Direction;
  fadeMs?: number;
}) {
  // หน้าตรง = กะพริบตาเป็นระยะ, มองการ์ด = หยุดไว้ (ดู useWitchIdle)
  const idle = useWitchIdle(direction === "front");
  const visible = direction === "front" ? idle.frame : direction;
  const fade = fadeMs ?? idle.fadeMs;

  /**
   * เปลี่ยนจากรูปซ้อนหนึ่งไปอีกรูป (เช่น มองซ้าย → มองขวา, ตาครึ่ง → ตาหลับ):
   * ถ้าจางออก-จางเข้าพร้อมกัน ช่วงกลางทั้งคู่โปร่งครึ่งหนึ่ง front.png ด้านล่างจะโผล่ขึ้นมาแวบหนึ่ง
   * จึงให้รูปเก่า (under) ทึบค้างอยู่ชั้นล่าง รูปใหม่จางเข้าทับด้านบน
   * จางเสร็จแล้วค่อยปล่อยรูปเก่า (ตอนนั้นถูกรูปใหม่บังหมดแล้ว มองไม่เห็น)
   * กลับหน้าตรง: ไม่มีรูปใหม่มาทับ รูปเก่าจึงจางออกตามปกติ เผยให้เห็น front.png
   * (ปรับ state ระหว่าง render ตามแบบที่ React แนะนำ แทนการ setState ใน useEffect)
   */
  const [shown, setShown] = useState(visible);
  const [under, setUnder] = useState<IdleFrame | Direction | null>(null);
  if (visible !== shown) {
    setShown(visible);
    setUnder(visible === "front" || shown === "front" ? null : shown);
  }
  useEffect(() => {
    if (!under) return;
    const id = setTimeout(() => setUnder(null), fade);
    return () => clearTimeout(id);
  }, [under, fade]);

  return (
    // ลอยขึ้นลงช้า ๆ ตลอดเวลา ทุกสถานะ (หยุดเมื่อผู้ใช้ตั้งค่าลดการเคลื่อนไหว)
    <PortraitFrame className="w-full max-w-[16rem] sm:max-w-[20rem]">
      {/*
          กันภาพกระพริบ: front.png ทึบอยู่ด้านล่างตลอด รูปอื่นจางเข้า-ออก "ทับ" ด้านบน
          ถ้าจางสลับกันเฉย ๆ ระหว่างเปลี่ยนจะมีช่วงที่ทั้งสองรูปโปร่งใสครึ่งหนึ่ง
          พื้นหลังมืดด้านหลังจะโผล่ออกมาเป็นวูบ ๆ
        */}
      <Image
        src="/witch/front.webp"
        alt="Learnora's witch mascot"
        fill
        loading="eager"
        sizes="(min-width: 640px) 320px, 256px"
        className="object-cover"
        data-witch-base
      />
      {OVERLAY_FRAMES.map((frame) => (
        <Image
          key={frame}
          src={`/witch/${frame}.webp`}
          alt=""
          aria-hidden
          fill
          // โหลดทุกรูปตั้งแต่แรก ตอนสลับเฟรมจะได้ไม่มีรูปไหนยังโหลดไม่เสร็จ
          loading="eager"
          sizes="(min-width: 640px) 320px, 256px"
          data-witch-current={frame === visible || undefined}
          className={cn(
            "object-cover transition-opacity ease-in-out motion-reduce:transition-none",
            frame === visible
              ? "z-20 opacity-100"
              : frame === under
                ? "z-10 opacity-100"
                : "opacity-0",
          )}
          style={{ transitionDuration: `${fade}ms` }}
        />
      ))}
    </PortraitFrame>
  );
}
