/** จำนวนเงินบาทพร้อมคอมมา ใช้กับยอดรวม/รายได้ ที่ 0 ต้องแสดงเป็น ฿0 */
export function formatBaht(value: number | string) {
  return `฿${Number(value).toLocaleString()}`;
}

/** ราคาคอร์ส/ยอดคำสั่งซื้อ: 0 แสดงเป็น "Free" ที่เหลือเป็นบาท */
export function formatPrice(value: number | string) {
  return Number(value) === 0 ? "Free" : formatBaht(value);
}

/** วันที่แบบ "5 Mar 2026" ใช้เหมือนกันทุกตาราง ไม่มีค่าแสดงเป็น "-" */
export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** ชื่อเต็มของผู้ใช้ (ผู้สอน นักเรียน แอดมิน) */
export function fullName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`;
}

/** เดือนกับปีแบบ "Sep 2026" (เช่น วันที่อัปเดตคอร์สล่าสุด) */
export function formatMonth(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

/** จำนวนพร้อมคำนามเอกพจน์/พหูพจน์: (1, "course") → "1 course", (1200, "student") → "1,200 students" */
export function formatCount(count: number, word: string) {
  return `${count.toLocaleString()} ${count === 1 ? word : `${word}s`}`;
}

/** คำทักทายตามเวลาไทย ใช้หัว dashboard ทั้งฝั่งผู้เรียนและผู้สอน */
export function greeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** ความยาวบทเรียนแบบนาฬิกา: 65 → "1:05", 3725 → "1:02:05" */
export function formatClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(Math.floor(totalSeconds % 60)).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

/** ค่า enum จาก API เป็นคำอ่านง่าย: "SUPER_ADMIN" → "Super admin" */
export function formatEnum(value: string) {
  const text = value.replaceAll("_", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
