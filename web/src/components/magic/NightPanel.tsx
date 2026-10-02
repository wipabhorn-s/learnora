import Starfield from "@/components/magic/Starfield";
import { cn } from "@/lib/utils";

/** สีดาวโทนม่วง-ทอง ใช้กับพื้นม่วงดำทุกที่ (หน้า 404, ฝั่งซ้ายหน้าสมัคร) */
export const NIGHT_STAR_COLORS = ["#ffffff", "#e9d5ff", "#c4b5fd", "#fde68a"];

/**
 * กล่องพื้นม่วงดำ (ไล่จากกลางไปขอบ) พร้อมดาวกะพริบ
 * ใช้ร่วมกันที่หน้า 404, ฝั่งซ้ายของหน้า (auth) และ section Why Choose ในหน้าแรก
 * เปลี่ยนแท็ก/ขนาด/การจัดวางผ่าน as + className ได้ (className ทับสีพื้นได้ด้วย)
 */
export default function NightPanel({
  as: Tag = "div",
  className,
  stars = {},
  children,
}: {
  as?: "div" | "main" | "aside" | "section";
  className?: string;
  stars?: React.ComponentProps<typeof Starfield>;
  children: React.ReactNode;
}) {
  return (
    <Tag
      className={cn(
        "relative isolate overflow-hidden bg-[radial-gradient(ellipse_at_center,#2a1745_0%,#0d0716_100%)]",
        className,
      )}
    >
      <Starfield colors={NIGHT_STAR_COLORS} {...stars} />
      {children}
    </Tag>
  );
}
