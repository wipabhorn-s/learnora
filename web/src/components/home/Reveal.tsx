"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

/**
 * ซ่อนไว้ก่อน เลื่อนลงมาถึงแล้วค่อยลอยขึ้นมา (เกิดครั้งเดียว ไม่หายเมื่อเลื่อนกลับ)
 * delay ใช้เรียงให้การ์ดในแถวเดียวกันขึ้นมาทีละใบ
 * ผู้ใช้ที่ตั้งค่าลดการเคลื่อนไหวจะเห็นทันที (ดู .reveal ใน globals.css)
 */
export default function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  /** วินาที */
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-visible={visible}
      className={cn("reveal", className)}
      style={{ "--reveal-delay": `${delay}s` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
