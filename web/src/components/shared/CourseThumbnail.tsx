import { BookOpen } from "lucide-react";
import Image from "next/image";

export default function CourseThumbnail({
  src,
  alt,
  className = "",
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-secondary ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="300px"
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
