"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateCourseStatusAction } from "@/lib/actions/course.action";
import type { MyCourseResponse } from "@/lib/api/course.api";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const STATUS_STYLE = {
  DRAFT: "border-amber-300 bg-amber-50 text-amber-700",
  PUBLISHED: "border-emerald-300 bg-emerald-50 text-emerald-700",
  SUSPENDED: "border-red-300 bg-red-50 text-red-700",
  DELETED: "border-border bg-muted text-muted-foreground",
};

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
        <span
          className={`inline-flex h-7 w-20 items-center justify-center rounded-full border text-xs font-medium capitalize ${STATUS_STYLE[currentStatus]}`}
        >
          {currentStatus.toLowerCase()}
        </span>
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
        window.alert(result.message);
        return;
      }

      router.refresh();
    });
  };

  return (
    <Dialog
      open={confirmOpen}
      onOpenChange={(open) => {
        if (!isPending) setConfirmOpen(open);
      }}
    >
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
        <span
          className={`inline-flex h-7 w-20 items-center justify-center rounded-full border text-xs font-medium capitalize ${STATUS_STYLE[currentStatus]}`}
        >
          {currentStatus.toLowerCase()}
        </span>
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

      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>
            {publishing ? "Publish this course?" : "Move course to draft?"}
          </DialogTitle>
          <DialogDescription>
            {publishing
              ? "The course will become visible to everyone on the Courses page."
              : "The course will disappear from public course listings. Students who already purchased it can still access their lessons."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={confirmChange}
            disabled={isPending}
          >
            {publishing ? "Publish" : "Move to Draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
