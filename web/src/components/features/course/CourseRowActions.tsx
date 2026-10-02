"use client";

import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { removeCourseAction } from "@/lib/actions/course.action";
import { toast } from "@/lib/toast";
import { Pencil, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function CourseRowActions({
  courseId,
  courseTitle,
}: {
  courseId: number;
  courseTitle: string;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await removeCourseAction(courseId);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Course deleted");
      setDeleteOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        render={
          <Link
            href={`/instructor/courses/${courseId}/player`}
            aria-label={`Preview ${courseTitle}`}
          />
        }
        type="button"
        nativeButton={false}
        variant="ghost"
        size="icon"
      >
        <Play />
      </Button>

      <Button
        render={
          <Link
            href={`/instructor/courses/${courseId}/edit`}
            aria-label={`Edit ${courseTitle}`}
          />
        }
        type="button"
        nativeButton={false}
        variant="ghost"
        size="icon"
      >
        <Pencil />
      </Button>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        pending={isPending}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={isPending}
            aria-label={`Delete ${courseTitle}`}
          >
            <Trash2 />
          </Button>
        }
        title="Delete this course?"
        description={`"${courseTitle}" will be removed from your course list. This action cannot be undone.`}
        confirmLabel="Delete Course"
        pendingLabel="Deleting..."
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
