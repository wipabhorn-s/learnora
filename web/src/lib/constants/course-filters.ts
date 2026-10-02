import { ACCESS_TYPES, CATEGORIES, LEVELS } from "@/lib/schemas/course.schema";

/**
 * ตัวกรองหน้าคอร์ส แยกไว้ไฟล์ธรรมดา (ไม่ใช่ "use client")
 * เพราะทั้ง server page และ client component ต้องอ่านค่าจริงร่วมกัน
 */
export const FILTER_GROUPS = [
  { key: "category", label: "Category", options: CATEGORIES },
  { key: "level", label: "Level", options: LEVELS },
  { key: "accessType", label: "Access type", options: ACCESS_TYPES },
] as const;

/** ทุก key ที่นับเป็น "กำลังกรอง" (ไม่รวม sort ที่แค่เปลี่ยนลำดับ) */
export const FILTER_KEYS = [
  "search",
  ...FILTER_GROUPS.map((group) => group.key),
];

export const COURSE_SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;
