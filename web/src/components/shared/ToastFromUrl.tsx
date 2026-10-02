"use client";

import { toast, type ToastKind } from "@/lib/toast";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * server action ที่ redirect กลับมาพร้อม ?error=... แสดงข้อความนั้นเป็น toast
 * แล้วลบพารามิเตอร์ออกจาก URL ไม่งั้นกดรีเฟรชแล้ว error เดิมจะเด้งซ้ำ
 */
export default function ToastFromUrl({
  params,
  kind = "error",
}: {
  /** ชื่อพารามิเตอร์ที่อาจมีข้อความ เช่น ["error"] หรือ ["cartError", "wishlistError"] */
  params: string[];
  kind?: ToastKind;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shown = useRef<string | null>(null);

  useEffect(() => {
    const name = params.find((param) => searchParams.get(param));
    if (!name) return;

    const message = searchParams.get(name)!;
    // StrictMode รัน effect สองรอบตอน dev กันไม่ให้ขึ้น toast ซ้ำ
    if (shown.current === message) return;
    shown.current = message;

    toast[kind](message);

    const next = new URLSearchParams(searchParams);
    for (const param of params) next.delete(param);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [params, kind, pathname, router, searchParams]);

  return null;
}
