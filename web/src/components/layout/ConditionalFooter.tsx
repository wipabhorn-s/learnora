"use client";

import Footer from "@/components/layout/Footer";
import { usePathname } from "next/navigation";

export default function ConditionalFooter() {
  const pathname = usePathname();

  if (pathname !== "/") return null;

  return <Footer />;
}
