/** ช่วงวันที่สำเร็จรูปของตัวกรอง (ค่าใน URL ?range=) */
export const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "custom", label: "Custom range" },
] as const;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** วันนี้ตามเวลาไทย ไม่ใช่เวลาของเซิร์ฟเวอร์ (Vercel รันเป็น UTC) */
function bangkokToday() {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
  })
    .format(new Date())
    .split("-")
    .map(Number);
  return { year, month: month - 1, day };
}

/** สร้าง YYYY-MM-DD จากปี/เดือน/วัน วันเกินหรือติดลบเลื่อนเดือนให้เอง */
function toDateString(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

/**
 * แปลง ?range= (และ ?from= ?to= ตอนเลือกเอง) เป็นช่วงวันที่ YYYY-MM-DD
 * ที่ API ใช้กรอง ค่าที่ไม่รู้จักหรือรูปแบบผิด = ไม่กรอง
 */
export function resolveDateRange(params: {
  range?: string;
  from?: string;
  to?: string;
}): { from?: string; to?: string } {
  const { year, month, day } = bangkokToday();
  const today = toDateString(year, month, day);

  switch (params.range) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: toDateString(year, month, day - 6), to: today };
    case "30d":
      return { from: toDateString(year, month, day - 29), to: today };
    case "this-month":
      return { from: toDateString(year, month, 1), to: today };
    case "last-month":
      // วันที่ 0 ของเดือนนี้ = วันสุดท้ายของเดือนก่อน
      return {
        from: toDateString(year, month - 1, 1),
        to: toDateString(year, month, 0),
      };
    case "custom":
      return {
        from:
          params.from && DATE_ONLY.test(params.from) ? params.from : undefined,
        to: params.to && DATE_ONLY.test(params.to) ? params.to : undefined,
      };
    default:
      return {};
  }
}
