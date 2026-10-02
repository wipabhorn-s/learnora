"use client";

import ConfirmDialog from "@/components/shared/ConfirmDialog";
import StatusBadge, {
  COURSE_STATUS_TONE,
} from "@/components/shared/StatusBadge";
import { updateCourseStatusAction } from "@/lib/actions/course.action";
import type { MyCourseResponse } from "@/lib/api/course.api";
import { formatEnum } from "@/lib/format";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type EditableStatus = "DRAFT" | "PUBLISHED";

export default function CourseStatusControl({
  courseId,
  status,
}: {
  courseId: number;
  status: MyCourseResponse["status"];
}) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (currentStatus !== "DRAFT" && currentStatus !== "PUBLISHED") {
    return (
      <span className="inline-flex h-9 w-36 items-center px-1">
        <StatusBadge tone={COURSE_STATUS_TONE[currentStatus]}>
          {formatEnum(currentStatus)}
        </StatusBadge>
      </span>
    );
  }

  const nextStatus: EditableStatus =
    currentStatus === "DRAFT" ? "PUBLISHED" : "DRAFT";
  const publishing = nextStatus === "PUBLISHED";

  const confirmChange = () => {
    const previousStatus = currentStatus;
    setCurrentStatus(nextStatus);
    setConfirmOpen(false);

    startTransition(async () => {
      const result = await updateCourseStatusAction(courseId, nextStatus);

      if (!result.success) {
        setCurrentStatus(previousStatus);
        toast.error(result.message);
        return;
      }

      router.refresh();
    });
  };

  return (
    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      pending={isPending}
      trigger={
        <button
          type="button"
          role="switch"
          aria-checked={currentStatus === "PUBLISHED"}
          aria-label={
            currentStatus === "PUBLISHED"
              ? "Unpublish course"
              : "Publish course"
          }
          onClick={() => setConfirmOpen(true)}
          disabled={isPending}
          className="inline-flex h-9 w-36 items-center justify-between gap-2 rounded-lg px-1 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <StatusBadge tone={COURSE_STATUS_TONE[currentStatus]}>
            {formatEnum(currentStatus)}
          </StatusBadge>
          <span
            aria-hidden="true"
            className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
              currentStatus === "PUBLISHED"
                ? "bg-emerald-500"
                : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`absolute left-0 top-1 size-4 rounded-full bg-white shadow-sm transition-transform ${
                currentStatus === "PUBLISHED"
                  ? "translate-x-5"
                  : "translate-x-1"
              }`}
            />
          </span>
        </button>
      }
      title={publishing ? "Publish this course?" : "Move course to draft?"}
      description={
        publishing
          ? "The course will become visible to everyone on the Courses page."
          : "The course will disappear from public course listings. Students who already purchased it can still access their lessons."
      }
      confirmLabel={publishing ? "Publish" : "Move to Draft"}
      onConfirm={confirmChange}
    />
  );
}
