import { CATEGORY_META } from "@/lib/constants/categories";
import { CheckCircle2, PlayCircle, Sparkles, Star } from "lucide-react";

/**
 * ภาพประกอบ hero แทนรูปสต็อก: การ์ดคอร์สแบบกระจกลอย วงแหวนความคืบหน้า
 * ป้ายลอย และวงโคจรไอคอนหมวดหมู่ (ของตกแต่งล้วน ไม่ใช่ข้อมูลจริง)
 */
export default function HeroVisual() {
  const orbit = CATEGORY_META.slice(0, 6);

  return (
    <div
      aria-hidden
      className="relative mx-auto aspect-square w-full max-w-[460px]"
    >
      {/* วงโคจร */}
      <div className="absolute inset-[4%] rounded-full border border-white/10" />
      <div className="absolute inset-[18%] rounded-full border border-dashed border-white/10" />
      <div className="animate-spin-slow absolute inset-[4%]">
        {orbit.map((category, index) => {
          const angle = (index / orbit.length) * 2 * Math.PI;
          return (
            <span
              key={category.value}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                // ปัดทศนิยม ให้เซิร์ฟเวอร์กับเบราว์เซอร์ได้ค่าเดียวกันเป๊ะ
                left: `${(50 + 50 * Math.cos(angle)).toFixed(2)}%`,
                top: `${(50 + 50 * Math.sin(angle)).toFixed(2)}%`,
              }}
            >
              <span
                className={`animate-spin-slow-reverse flex size-11 items-center justify-center rounded-2xl shadow-lg shadow-black/30 ring-1 ring-white/30 ${category.color}`}
              >
                <category.icon size={20} />
              </span>
            </span>
          );
        })}
      </div>

      {/* การ์ดคอร์สกระจกตรงกลาง */}
      <div
        className="animate-float absolute top-1/2 left-1/2 w-[62%] -translate-x-1/2 -translate-y-1/2"
        style={{ "--float-duration": "7s" } as React.CSSProperties}
      >
        <div className="rounded-3xl border border-white/20 bg-white/10 p-4 shadow-2xl shadow-violet-950/50 backdrop-blur-xl">
          <div className="relative mb-3 flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(255_255_255/0.35),transparent_55%)]" />
            <PlayCircle
              size={44}
              className="relative text-white drop-shadow-lg"
            />
          </div>
          <div className="mb-1 h-2.5 w-3/4 rounded-full bg-white/70" />
          <div className="mb-3 h-2 w-1/2 rounded-full bg-white/35" />
          <div className="flex items-center justify-between">
            <div className="flex gap-0.5 text-amber-300">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={12} className="fill-current" />
              ))}
            </div>

            {/* วงแหวนความคืบหน้า */}
            <svg viewBox="0 0 60 60" className="size-12 -rotate-90">
              <circle
                cx="30"
                cy="30"
                r="26"
                fill="none"
                stroke="rgb(255 255 255 / 0.15)"
                strokeWidth="6"
              />
              <circle
                cx="30"
                cy="30"
                r="26"
                fill="none"
                stroke="url(#hero-progress)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="163"
                className="animate-progress-fill"
              />
              <defs>
                <linearGradient id="hero-progress" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      {/* ป้ายลอย */}
      <div
        className="animate-float absolute z-10 top-[10%] right-[2%]"
        style={
          {
            "--float-duration": "5s",
            "--float-delay": "-1s",
            "--float-rotate": "6deg",
          } as React.CSSProperties
        }
      >
        <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-[#2a1650]/85 px-3 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-md">
          <CheckCircle2 size={16} className="text-emerald-300" />
          Lesson complete
        </div>
      </div>
      <div
        className="animate-float absolute z-10 bottom-[12%] left-0"
        style={
          {
            "--float-duration": "6s",
            "--float-delay": "-3s",
            "--float-rotate": "-5deg",
          } as React.CSSProperties
        }
      >
        <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-[#2a1650]/85 px-3 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-md">
          <Sparkles size={16} className="text-amber-300" />
          +1 skill unlocked
        </div>
      </div>
    </div>
  );
}
