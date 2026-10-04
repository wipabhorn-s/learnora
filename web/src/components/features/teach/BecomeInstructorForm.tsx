"use client";

import AgreementCheckbox, {
  AgreementLink,
} from "@/components/shared/AgreementCheckbox";
import { CTA_CLASS } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { becomeInstructorAction } from "@/lib/actions/security.action";
import { LEGAL } from "@/lib/constants/legal";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { useState, useTransition } from "react";

/** สรุปข้อตกลงผู้สอนสั้น ๆ ก่อนกดยอมรับ (ฉบับเต็มอยู่ในหน้า Terms หัวข้อ Instructors) */
const KEY_TERMS = [
  `You keep ${LEGAL.INSTRUCTOR_SHARE_PERCENT}% of every paid sale. Earnings become payable ${LEGAL.REFUND_WINDOW_DAYS} days after purchase and are sent to your bank account.`,
  "You own your content and confirm you have the rights to everything in your courses.",
  "Courses must be accurate. We may unpublish courses that break the Terms.",
];

/**
 * เปิดสิทธิ์สอน: อ่านข้อตกลงสำคัญ ติ๊กยอมรับ แล้วค่อยกดปุ่มได้
 * API บันทึกเวลาที่ยอมรับไว้ (instructorTermsAcceptedAt) เป็นหลักฐาน
 */
export default function BecomeInstructorForm() {
  const [accepted, setAccepted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!accepted) return;

    startTransition(async () => {
      // สำเร็จแล้ว action จะ redirect ไปฝั่งสอนเอง ถึงบรรทัดถัดไปแปลว่าพลาด
      const result = await becomeInstructorAction(true);
      if (result) toast.error(result.message);
    });
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto grid max-w-xl gap-6 text-left">
      <ul className="grid gap-3 rounded-2xl border bg-muted/40 p-5 text-sm">
        {KEY_TERMS.map((term) => (
          <li key={term} className="flex gap-3">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{term}</span>
          </li>
        ))}
      </ul>

      <AgreementCheckbox
        checked={accepted}
        onCheckedChange={setAccepted}
        disabled={isPending}
      >
        I have read and agree to the{" "}
        <AgreementLink href="/terms#instructors">
          Terms of Service
        </AgreementLink>
        , including the Instructors section.
      </AgreementCheckbox>

      <Button
        type="submit"
        disabled={!accepted || isPending}
        className={cn(CTA_CLASS, "justify-self-center")}
      >
        {isPending ? "Setting things up..." : "Become an instructor"}
      </Button>
    </form>
  );
}
