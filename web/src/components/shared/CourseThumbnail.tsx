import { BookOpen } from "lucide-react";
import Image from "next/image";

export default function CourseThumbnail({
  src,
  alt,
  className = "",
  sizes = "300px",
}: {
  src: string | null;
  alt: string;
  className?: string;
  /** ความกว้างที่แสดงจริง ให้ next/image เลือกรูปขนาดพอดี ไม่เบลอ */
  sizes?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-secondary ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <BookOpen size={24} className="text-primary/40" />
        </div>
      )}
    </div>
  );
}
