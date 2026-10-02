import SparkleStar from "@/components/magic/SparkleStar";

/**
 * ดาวกระพริบ (ของตกแต่งล้วน) ใส่ในกล่องที่มี position: relative
 *
 * ตำแหน่ง/ขนาด/สี/จังหวะสุ่มจาก seed ได้ค่าเดิมทุกครั้ง
 * ถ้าใช้ Math.random() ตอน render ฝั่งเซิร์ฟเวอร์กับเบราว์เซอร์จะได้คนละค่า (hydration mismatch)
 * ทศนิยมปัดไว้ 2 ตำแหน่งด้วยเหตุผลเดียวกัน
 */
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

type Star = {
  top: string;
  left: string;
  size: number;
  color: string;
  /** ดาว 4 แฉก (ใหญ่กว่าจุดดาวธรรมดา) */
  sparkle: boolean;
  duration: string;
  delay: string;
};

function makeStars(
  count: number,
  seed: number,
  colors: string[],
  sparkleRatio: number,
): Star[] {
  const random = seeded(seed);
  return Array.from({ length: count }, () => {
    const sparkle = random() < sparkleRatio;
    const roll = random();
    return {
      top: (random() * 100).toFixed(2),
      left: (random() * 100).toFixed(2),
      size: sparkle
        ? 8 + Math.round(random() * 8)
        : roll < 0.15
          ? 3
          : roll < 0.5
            ? 2
            : 1,
      color: colors[Math.floor(random() * colors.length)],
      sparkle,
      duration: (2 + random() * 4).toFixed(2),
      delay: (random() * 5).toFixed(2),
    };
  });
}

export default function Starfield({
  count = 70,
  seed = 42,
  colors = ["#ffffff"],
  sparkleRatio = 0,
}: {
  count?: number;
  /** เปลี่ยน seed = ได้ลายดาวชุดใหม่ (ใช้คนละ seed ในแต่ละ section ไม่ให้ลายซ้ำกัน) */
  seed?: number;
  colors?: string[];
  /** สัดส่วนดาวที่เป็นดาว 4 แฉก (0-1) */
  sparkleRatio?: number;
}) {
  const stars = makeStars(count, seed, colors, sparkleRatio);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {stars.map((star, index) => {
        const style = {
          top: `${star.top}%`,
          left: `${star.left}%`,
          "--twinkle-duration": `${star.duration}s`,
          "--twinkle-delay": `${star.delay}s`,
        } as React.CSSProperties;

        return star.sparkle ? (
          <SparkleStar
            key={index}
            size={star.size}
            color={star.color}
            className="animate-twinkle absolute"
            style={{
              ...style,
              filter: `drop-shadow(0 0 4px ${star.color})`,
            }}
          />
        ) : (
          <span
            key={index}
            className="animate-twinkle absolute rounded-full"
            style={{
              ...style,
              width: star.size,
              height: star.size,
              backgroundColor: star.color,
              boxShadow:
                star.size > 1
                  ? `0 0 ${star.size * 3}px ${star.color}`
                  : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
