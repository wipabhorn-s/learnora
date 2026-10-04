import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// ล้าง DOM หลังแต่ละ test ไม่ให้คอมโพเนนต์ของ test ก่อนหน้าค้างอยู่
afterEach(() => {
  cleanup();
});

// jsdom ไม่มี matchMedia ตั้งค่าเริ่มต้นว่าไม่ได้ตั้งค่าลดการเคลื่อนไหว
// (test ที่ต้องการค่าอื่นใช้ vi.stubGlobal ทับได้)
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// next/image ต้องใช้ config ของ Next ใน test ใช้ <img> ธรรมดาแทน (ทุกไฟล์ test)
vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    sizes: _sizes,
    priority: _priority,
    alt,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    sizes?: string;
    priority?: boolean;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));
