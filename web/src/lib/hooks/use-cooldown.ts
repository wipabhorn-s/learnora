"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * นับถอยหลังเป็นวินาทีสำหรับปุ่มที่กดซ้ำถี่ ๆ ไม่ได้ เช่น "ส่งลิงก์อีกครั้ง"
 * เก็บเวลาสิ้นสุดแทนการลดทีละหนึ่ง ตัวเลขจึงไม่เพี้ยนตอนแท็บถูกพักไว้เบื้องหลัง
 */
export function useCooldown(initialSeconds = 0) {
  const [endsAt, setEndsAt] = useState(() =>
    initialSeconds > 0 ? Date.now() + initialSeconds * 1000 : 0,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt <= Date.now()) return;

    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= endsAt) window.clearInterval(id);
    }, 250);

    return () => window.clearInterval(id);
  }, [endsAt]);

  const start = useCallback((seconds: number) => {
    const current = Date.now();
    setNow(current);
    setEndsAt(current + seconds * 1000);
  }, []);

  const secondsLeft = Math.max(0, Math.ceil((endsAt - now) / 1000));

  return { secondsLeft, start };
}
