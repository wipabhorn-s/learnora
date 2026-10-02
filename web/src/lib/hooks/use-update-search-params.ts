"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * แก้ query string ของหน้าปัจจุบันแล้วเปลี่ยน URL ใช้กับตัวกรอง/การเรียงลำดับ
 * เปลี่ยนตัวกรอง = กลับไปหน้า 1 เสมอ (ลบ ?page ทิ้ง)
 */
export function useUpdateSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page");
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  /** ค่าว่าง/null = ลบ key นั้นออก */
  const set = (key: string, value: string | null) =>
    update((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });

  const remove = (...keys: string[]) =>
    update((params) => keys.forEach((key) => params.delete(key)));

  return { searchParams, set, remove };
}
