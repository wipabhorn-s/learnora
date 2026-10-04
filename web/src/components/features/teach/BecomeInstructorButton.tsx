"use client";

import { CTA_CLASS } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { becomeInstructorAction } from "@/lib/actions/security.action";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useTransition } from "react";

export default function BecomeInstructorButton({
  className,
}: {
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      // สำเร็จแล้ว action จะ redirect ไปฝั่งสอนเอง ถึงบรรทัดถัดไปแปลว่าพลาด
      const result = await becomeInstructorAction();
      if (result) toast.error(result.message);
    });
  };

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className={cn(CTA_CLASS, className)}
    >
      {isPending ? "Setting things up..." : "Become an instructor"}
    </Button>
  );
}
