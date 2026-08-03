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
import { removeCourseAction } from "@/lib/actions/course.action";
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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await removeCourseAction(courseId);

      if (!result.success) {
        setError(result.message);
        return;
      }

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

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (isPending) return;
          setDeleteOpen(open);
          if (!open) setError(null);
        }}
      >
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

        <DialogContent showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>Delete this course?</DialogTitle>
            <DialogDescription>
              &quot;{courseTitle}&quot; will be removed from your course list.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
