"use client";

import { useEffect, useState } from "react";

/** รูปหน้าตรงที่ใช้ตอนแม่มดอยู่นิ่ง (ชื่อตรงกับไฟล์ใน /public/witch/) */
export type IdleFrame = "front" | "front-blink-half" | "front-blink-closed";

export const IDLE_FRAMES: IdleFrame[] = [
  "front",
  "front-blink-half",
  "front-blink-closed",
];

/**
 * หนึ่งจังหวะของการกะพริบตา (มิลลิวินาที)
 * - fade: เวลาจางเข้าสู่เฟรมนี้
 * - hold: นับจากเริ่มเฟรมนี้ อีกนานเท่าไรถึงไปเฟรมถัดไป (ยาวกว่า fade เสมอ เฟรมจึงชัดเต็มก่อนเปลี่ยน)
 */
export type BlinkStep = { frame: IdleFrame; fade: number; hold: number };

/**
 * จังหวะแบบคนกะพริบจริง: หลับเร็ว → ค้างตาหลับนิดหนึ่ง → ลืมช้ากว่า (รวม ≈ 0.32 วิ)
 * (เดิมทุกเฟรม 60ms เท่ากัน และจางยาวเท่าเฟรม เฟรมไม่เคยชัดเต็ม ดูเป็นภาพซ้อนวูบ ๆ)
 */
export const BLINK_STEPS: readonly BlinkStep[] = [
  { frame: "front-blink-half", fade: 40, hold: 50 },
  { frame: "front-blink-closed", fade: 40, hold: 100 },
  { frame: "front-blink-half", fade: 60, hold: 70 },
  { frame: "front", fade: 100, hold: 100 },
];

/** เวลาทั้งหมด (มิลลิวินาที) */
export const TIMING = {
  /** ช่วงห่างระหว่างการกะพริบตา (สุ่มในช่วงนี้) นับจากกะพริบครั้งก่อนจบ */
  blinkEvery: [1500, 2500],
} as const;

/** ความยาวการกะพริบหนึ่งครั้ง (ตั้งแต่เริ่มหลับจนลืมตาเสร็จ) */
export const BLINK_DURATION = BLINK_STEPS.reduce(
  (sum, step) => sum + step.hold,
  0,
);

const between = ([min, max]: readonly [number, number]) =>
  min + Math.random() * (max - min);

const FRONT: BlinkStep = BLINK_STEPS[BLINK_STEPS.length - 1];

/**
 * ── กะพริบตาตอนแม่มดอยู่นิ่ง (มองหน้าตรง ไม่มีการ์ดถูกชี้) ──
 *
 * ทุก 1.5-2.5 วิ (สุ่ม) เล่นตาม BLINK_STEPS แล้วตั้งเวลาครั้งถัดไปต่อเรื่อย ๆ
 * คืนค่าเฟรมที่ต้องแสดง และเวลาจางเข้าสู่เฟรมนั้น
 *
 * enabled = false (มีการ์ดถูกชี้): ล้างตัวจับเวลาทั้งหมด กลับไปรูป front
 * เมื่อ enabled กลับเป็น true จะเริ่มนับรอบใหม่
 *
 * ผู้ใช้ที่ตั้งค่าลดการเคลื่อนไหวก็ยังกะพริบ (เป็นการเปลี่ยนรูปเล็ก ๆ ไม่ใช่การเคลื่อนที่)
 */
export function useWitchIdle(enabled: boolean): {
  frame: IdleFrame;
  fadeMs: number;
} {
  const [step, setStep] = useState<BlinkStep>(FRONT);

  useEffect(() => {
    if (!enabled) return;

    // ตัวจับเวลาทั้งหมดของรอบนี้ หยุด/ออกจากหน้าแล้วล้างทีเดียวได้หมด
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (run: () => void, ms: number) => {
      const id = setTimeout(() => {
        timers.delete(id);
        run();
      }, ms);
      timers.add(id);
    };

    const scheduleBlink = () => later(blink, between(TIMING.blinkEvery));

    /** เฟรมแรกแสดงทันที เฟรมถัด ๆ ไปเริ่มตาม hold ของเฟรมก่อนหน้า แล้วตั้งเวลารอบถัดไป */
    function blink() {
      let at = 0;
      for (const next of BLINK_STEPS) {
        if (at === 0) setStep(next);
        else later(() => setStep(next), at);
        at += next.hold;
      }
      later(scheduleBlink, at);
    }

    scheduleBlink();

    return () => {
      // หยุดทุกอย่าง และกลับไปหน้าตรงตาเปิด รอเริ่มรอบใหม่
      timers.forEach(clearTimeout);
      timers.clear();
      setStep(FRONT);
    };
  }, [enabled]);

  const current = enabled ? step : FRONT;
  return { frame: current.frame, fadeMs: current.fade };
}
