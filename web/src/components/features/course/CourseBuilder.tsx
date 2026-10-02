"use client";

import CourseDetailsForm from "@/components/features/course/CourseDetailsForm";
import EditLessons from "@/components/features/course/EditLessons";
import CourseThumbnail from "@/components/shared/CourseThumbnail";
import StatusBadge, {
  COURSE_STATUS_TONE,
} from "@/components/shared/StatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { updateCourseStatusAction } from "@/lib/actions/course.action";
import type { InstructorCourseResponse } from "@/lib/api/course.api";
import type { LessonResponse } from "@/lib/api/lesson.api";
import { formatEnum, formatPrice } from "@/lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Tab = "lessons" | "details";

/**
 * หน้าหลักของคอร์สหลังสร้างแล้ว: จัดการบทเรียน แก้รายละเอียด และเผยแพร่
 * ในที่เดียว แทนขั้นตอน 3-4 เดิม (Lessons → Review) ที่ต้องกดไปกลับ
 */
export default function CourseBuilder({
  course,
}: {
  course: InstructorCourseResponse;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("lessons");
  const [lessons, setLessons] = useState<LessonResponse[]>(course.lessons);
  const [isPending, startTransition] = useTransition();

  const price = Number(course.price);
  const hasLessons = lessons.length > 0;
  const isPublished = course.status === "PUBLISHED";
  const isSuspended = course.status === "SUSPENDED";

  const checklist = [
    { label: "Title and description", done: true },
    { label: "At least one lesson", done: hasLessons },
    { label: "Thumbnail (recommended)", done: Boolean(course.thumbnailUrl) },
  ];

  const changeStatus = () => {
    const next = isPublished ? "DRAFT" : "PUBLISHED";

    startTransition(async () => {
      const result = await updateCourseStatusAction(course.id, next);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(
        next === "PUBLISHED"
          ? "Course published. Students can now find it."
          : "Course moved back to draft.",
      );
      router.refresh();
    });
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid min-w-0 gap-4">
        <SegmentedControl
          options={[
            { value: "lessons", label: "Lessons" },
            { value: "details", label: "Details" },
          ]}
          value={tab}
          onChange={setTab}
        />

        <Card className="p-6 sm:p-8">
          {tab === "lessons" ? (
            <EditLessons
              courseId={course.id}
              lessons={lessons}
              onLessonsChange={setLessons}
            />
          ) : (
            <CourseDetailsForm course={course} />
          )}
        </Card>
      </div>

      <aside className="grid gap-4 lg:sticky lg:top-8">
        <Card className="gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Status</h2>
            <StatusBadge size="sm" tone={COURSE_STATUS_TONE[course.status]}>
              {formatEnum(course.status)}
            </StatusBadge>
          </div>

          {isSuspended ? (
            <p className="text-sm text-muted-foreground">
              An admin suspended this course. Contact support to restore it.
            </p>
          ) : (
            <>
              <ul className="grid gap-2 text-sm">
                {checklist.map((item) => (
                  <li key={item.label} className="flex items-center gap-2">
                    {item.done ? (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    ) : (
                      <Circle size={16} className="text-muted-foreground" />
                    )}
                    <span
                      className={
                        item.done ? "text-foreground" : "text-muted-foreground"
                      }
                    >
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                variant={isPublished ? "outline" : "default"}
                onClick={changeStatus}
                disabled={isPending || (!isPublished && !hasLessons)}
                className="h-11 w-full rounded-xl text-sm font-semibold"
              >
                {isPending
                  ? "Saving..."
                  : isPublished
                    ? "Move back to draft"
                    : "Publish course"}
              </Button>

              {!isPublished && !hasLessons && (
                <p className="text-xs text-muted-foreground">
                  Add a lesson to publish this course.
                </p>
              )}
            </>
          )}
        </Card>

        <Card className="gap-0 overflow-hidden p-0">
          <CourseThumbnail
            src={course.thumbnailUrl}
            alt={course.title}
            className="aspect-video w-full"
          />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-5 text-sm">
            <div>
              <dt className="text-muted-foreground">Price</dt>
              <dd className="font-semibold">{formatPrice(price)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Access</dt>
              <dd className="font-semibold">
                {course.accessType === "LIMITED"
                  ? `${course.accessDuration} days`
                  : "Lifetime"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Category</dt>
              <dd className="font-semibold">{formatEnum(course.category)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Level</dt>
              <dd className="font-semibold">{formatEnum(course.level)}</dd>
            </div>
          </dl>
          <div className="grid gap-2 border-t border-border p-5">
            {tab !== "details" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setTab("details")}
                className="h-10 w-full rounded-xl"
              >
                Edit details
              </Button>
            )}
            {hasLessons && (
              <Link
                href={`/instructor/courses/${course.id}/player`}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-10 w-full rounded-xl",
                )}
              >
                <Eye />
                Preview as a student
              </Link>
            )}
          </div>
        </Card>
      </aside>
    </div>
  );
}
