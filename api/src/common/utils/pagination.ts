/**
 * ตัวช่วยแบ่งหน้า ใช้เหมือนกันทุก endpoint ที่ส่งรายการกลับเป็นหน้า ๆ
 * (เลขหน้าเริ่มที่ 1 ตาม query ?page= ที่ web ส่งมา)
 */

/** เลขหน้า → skip/take ของ Prisma */
export function pageQuery(page: number, limit: number) {
  return { skip: (page - 1) * limit, take: limit };
}

/** จำนวนหน้าทั้งหมด (ไม่มีข้อมูล = 0 หน้า) */
export function pageCount(total: number, limit: number) {
  return Math.ceil(total / limit);
}

/** รูปแบบผลลัพธ์แบ่งหน้าที่ web ใช้ (PaginatedResponse) */
export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
) {
  return { items, total, page, totalPages: pageCount(total, limit) };
}
