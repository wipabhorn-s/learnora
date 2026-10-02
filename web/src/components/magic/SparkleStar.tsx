/** ดาว 4 แฉก ใช้ทั้งในพื้นหลังดาว (Starfield) และประกายบนการ์ด (WhyChooseSection) */
export default function SparkleStar({
  size,
  color = "currentColor",
  className,
  style,
}: {
  size: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      style={style}
    >
      <path d="M12 0c.6 5.6 3.4 8.4 9 9-5.6.6-8.4 3.4-9 9-.6-5.6-3.4-8.4-9-9 5.6-.6 8.4-3.4 9-9z" />
    </svg>
  );
}
