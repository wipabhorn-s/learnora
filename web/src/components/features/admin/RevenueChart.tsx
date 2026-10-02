import { Card } from "@/components/ui/card";
import type { AdminDashboard } from "@/lib/api/admin.api";
import { formatBaht } from "@/lib/format";

type Day = AdminDashboard["dailyRevenue"][number];

/** "2026-09-30" → "30 Sep" (สตริงวันที่อยู่แล้ว จัดรูปแบบเป็น UTC จะได้ไม่เลื่อนวัน) */
function shortDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * กราฟแท่งรายได้รายวัน วาดด้วย CSS ไม่ต้องใช้ไลบรารีกราฟ
 * ชี้หรือกด Tab ไปที่แท่งเพื่อดูยอดของวันนั้น พื้นที่ชี้ได้คือทั้งคอลัมน์
 * ไม่ใช่แค่ตัวแท่ง วันที่ยอดน้อยจึงยังชี้โดนง่าย
 */
export default function RevenueChart({ days }: { days: Day[] }) {
  const total = days.reduce((sum, day) => sum + day.total, 0);
  const count = days.reduce((sum, day) => sum + day.count, 0);
  const max = Math.max(...days.map((day) => day.total), 0);
  const middle = days[Math.floor(days.length / 2)];

  return (
    <Card className="min-h-0 gap-0 p-6">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Revenue</h2>
          <p className="mt-1 text-sm text-muted-foreground">Last 30 days</p>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="text-2xl font-extrabold text-foreground">
            {formatBaht(total)}
          </span>{" "}
          from {count} {count === 1 ? "payment" : "payments"}
        </p>
      </div>

      <div className="relative mt-6 flex min-h-48 flex-1 flex-col">
        {max > 0 && (
          <span className="text-xs text-muted-foreground">
            {formatBaht(max)}
          </span>
        )}

        <div className="relative flex flex-1 items-end gap-0.5 border-b border-border pt-2">
          {days.map((day, index) => {
            // tooltip ชิดขอบการ์ดฝั่งไหน ให้ยึดขอบนั้นแทนกึ่งกลาง ไม่งั้นล้นออกนอกการ์ด
            const anchor =
              index < 5
                ? "left-0"
                : index >= days.length - 5
                  ? "right-0"
                  : "left-1/2 -translate-x-1/2";
            const label = `${shortDate(day.date)}: ${formatBaht(day.total)} from ${day.count} ${
              day.count === 1 ? "payment" : "payments"
            }`;

            return (
              <div
                key={day.date}
                tabIndex={0}
                aria-label={label}
                className="group relative flex h-full flex-1 items-end rounded-t-sm outline-none hover:bg-muted/60 focus-visible:bg-muted/60"
              >
                <div
                  className="w-full rounded-t-sm bg-primary"
                  style={{
                    height: max > 0 ? `${(day.total / max) * 100}%` : 0,
                  }}
                />
                <div
                  className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-lg border bg-card px-3 py-2 text-xs whitespace-nowrap shadow-md group-hover:block group-focus-visible:block ${anchor}`}
                >
                  <p className="font-semibold">{shortDate(day.date)}</p>
                  <p className="text-muted-foreground">
                    {formatBaht(day.total)} · {day.count}{" "}
                    {day.count === 1 ? "payment" : "payments"}
                  </p>
                </div>
              </div>
            );
          })}

          {max === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              No sales in the last 30 days
            </p>
          )}
        </div>

        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{shortDate(days[0].date)}</span>
          <span>{shortDate(middle.date)}</span>
          <span>Today</span>
        </div>
      </div>
    </Card>
  );
}
