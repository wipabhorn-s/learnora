"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CourseBackButton() {
  const router = useRouter();

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/courses");
  };

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={goBack}
      className="-ml-3 mb-3 text-white/70 hover:bg-white/10 hover:text-white"
    >
      <ArrowLeft size={18} />
      Back
    </Button>
  );
}
