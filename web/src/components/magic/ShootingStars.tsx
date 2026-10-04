/** ตำแหน่งจุดเริ่ม (% ของกล่อง) และรอบเวลาของดาวตกหนึ่งดวง */
export type ShootingStar = {
  top: string;
  left: string;
  /** วินาทีต่อรอบ ดาวโผล่แค่ช่วงต้นรอบ (~9%) ที่เหลือมองไม่เห็น */
  duration: number;
  delay: number;
};

/**
 * ดาวตก: หัวสว่าง หางจาง พุ่งเฉียงลงซ้าย (ของตกแต่งล้วน)
 * ใส่ในกล่องที่มี position: relative และ overflow: hidden
 * ใช้รอบเวลาคนละค่า (เลขที่หารกันไม่ลงตัว) ดาวจึงไม่ค่อยมาพร้อมกัน
 * หยุดเมื่อผู้ใช้ตั้งค่าลดการเคลื่อนไหว (ดู .animate-shooting-star ใน globals.css)
 */
export default function ShootingStars({ stars }: { stars: ShootingStar[] }) {
  return stars.map((star, index) => (
    <span
      key={index}
      aria-hidden
      className="animate-shooting-star pointer-events-none absolute h-px w-36 origin-left rounded-full bg-gradient-to-r from-white via-violet-200/70 to-transparent opacity-0 shadow-[0_0_6px_1px_rgb(255_255_255/0.6)]"
      style={
        {
          top: star.top,
          left: star.left,
          "--shoot-duration": `${star.duration}s`,
          "--shoot-delay": `${star.delay}s`,
        } as React.CSSProperties
      }
    />
  ));
}
