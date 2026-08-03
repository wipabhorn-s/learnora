import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default function Logo({
  light = false,
  compactOnSmall = false,
}: {
  light?: boolean;
  compactOnSmall?: boolean;
}) {
  return (
    <Link
      href="/"
      className={`flex shrink-0 items-center gap-2 ${
        compactOnSmall ? "justify-center xl:justify-start" : ""
      }`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
        <GraduationCap size={18} className="text-white" />
      </div>
      <span
        className={`text-xl font-extrabold ${
          compactOnSmall ? "hidden xl:inline" : ""
        } ${light ? "text-white" : "text-foreground"}`}
      >
        Learn
        <span className={light ? "text-violet-200" : "text-primary"}>ora</span>
      </span>
    </Link>
  );
}
