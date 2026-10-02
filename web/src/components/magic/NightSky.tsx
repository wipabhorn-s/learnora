import ShootingStars, {
  type ShootingStar,
} from "@/components/magic/ShootingStars";
import Starfield from "@/components/magic/Starfield";

/** พื้นหลังฟ้ากลางคืน: แสงออโรร่าเคลื่อนไหว + ดาวกระพริบ + ดาวตก (ของตกแต่งล้วน) */

/**
 * ดาวตก 3 ดวง คนละรอบเวลา (เลขเฉพาะห่างกัน) จึงไม่ค่อยมาพร้อมกัน
 * แต่ละดวงโผล่ช่วงต้นรอบไม่ถึงวินาที ที่เหลือของรอบมองไม่เห็น
 */
const SHOOTING_STARS: ShootingStar[] = [
  { top: "8%", left: "72%", duration: 11, delay: 2 },
  { top: "22%", left: "92%", duration: 17, delay: 7 },
  { top: "4%", left: "45%", duration: 23, delay: 13 },
];

export default function NightSky() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* ฟ้า */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#2e1065_0%,#1a1033_45%,#0b0718_100%)]" />

      {/* ออโรร่า: ก้อนสีเบลอ 3 ก้อนลอยคนละจังหวะ */}
      <div
        className="animate-aurora absolute -top-1/4 -left-1/4 h-[70%] w-[60%] rounded-full bg-violet-600/40 blur-[110px]"
        style={{ animationDuration: "22s" }}
      />
      <div
        className="animate-aurora absolute top-1/4 -right-1/4 h-[60%] w-[55%] rounded-full bg-fuchsia-500/30 blur-[120px]"
        style={{ animationDuration: "26s", animationDelay: "-8s" }}
      />
      <div
        className="animate-aurora absolute -bottom-1/3 left-1/4 h-[60%] w-[50%] rounded-full bg-cyan-400/20 blur-[120px]"
        style={{ animationDuration: "30s", animationDelay: "-15s" }}
      />

      {/* ดาว */}
      <Starfield count={70} seed={42} />

      {/* ดาวตก: หัวสว่าง หางจางไปทางขวาบน */}
      <ShootingStars stars={SHOOTING_STARS} />

      {/* ขอบล่างจางลงไปเป็นสีพื้นหลังของหน้า ต่อกับส่วนถัดไปได้เนียน */}
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent via-background/50 via-60% to-background" />
    </div>
  );
}
