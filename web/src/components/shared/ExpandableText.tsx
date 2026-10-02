"use client";

import { cn } from "@/lib/utils";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * ข้อความยาวแสดง 3 บรรทัดก่อน มีปุ่ม Show more เฉพาะตอนที่ถูกตัดจริง
 * (วัดจากขนาดที่แสดงจริง ข้อความสั้นจึงไม่มีปุ่มโผล่มาเปล่า ๆ)
 */
export default function ExpandableText({
  text,
  className,
  buttonClassName,
}: {
  text: string;
  className?: string;
  /** สีปุ่ม Show more (เช่นบนพื้นสีเข้มใช้สีขาว) */
  buttonClassName?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      // วัดตอนยังพับอยู่เท่านั้น ตอนขยายแล้วไม่มีอะไรล้น
      if (!expanded) {
        setOverflowing(element.scrollHeight > element.clientHeight + 1);
      }
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded, text]);

  return (
    <div>
      <p
        ref={ref}
        className={cn(
          "whitespace-pre-line",
          !expanded && "line-clamp-3",
          className,
        )}
      >
        {text}
      </p>
      {(overflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className={cn(
            "mt-1 text-sm font-semibold text-primary hover:underline",
            buttonClassName,
          )}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
