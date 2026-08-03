"use client";

import Logo from "@/components/shared/Logo";
import { updateProgressAction } from "@/lib/actions/learning.action";
import { PlayerLesson, PlayerResponse } from "@/lib/api/learning.api";
import { formatDuration } from "@/lib/utils";
import { ArrowLeft, BookOpen, Check, ChevronRight, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

export default function CoursePlayer({
  data,
  trackProgress = true,
  backHref = "/my-courses",
}: {
  data: PlayerResponse;
  trackProgress?: boolean;
  backHref?: string;
}) {
  const router = useRouter();
  const [lessons, setLessons] = useState<PlayerLesson[]>(data.lessons);
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedRef = useRef(0);
  const [, startTransition] = useTransition();

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.replace(backHref);
  };

  if (lessons.length === 0) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-foreground">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-3">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              className="shrink-0 text-white/60 transition-colors hover:text-white"
            >
              <ArrowLeft size={20} />
            </button>
            <Logo light />
            <span className="hidden truncate text-sm text-white/40 md:block">
              {data.course.title}
            </span>
          </div>
          {trackProgress ? (
            <div className="hidden items-center gap-3 md:flex">
              <div className="flex flex-col items-end">
                <span className="text-xs text-white/50">Progress</span>
                <span className="text-sm font-bold text-white">0%</span>
              </div>
              <div className="h-2 w-24 overflow-hidden rounded-full bg-white/20" />
            </div>
          ) : (
            <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
              Instructor Preview
            </span>
          )}
        </div>

        <main className="flex min-h-0 flex-1 items-center justify-center px-6 py-10 text-center">
          <div className="max-w-md">
            <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-white/10">
              <BookOpen size={38} className="text-primary" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">
              No lessons available yet
            </h1>
            <p className="mt-3 leading-relaxed text-white/55">
              The instructor has not added any lessons to this course yet.
              Please check back later.
            </p>
            <button
              type="button"
              onClick={goBack}
              className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Go Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  const currentLesson = lessons[currentIndex];
  const completedCount = lessons.filter((l) => l.progress.isCompleted).length; // ยังใช้ที่ sidebar "X/Y completed"

  const totalDuration = lessons.reduce((sum, l) => sum + l.durationSeconds, 0);
  const totalWatched = lessons.reduce(
    (sum, l) => sum + Math.min(l.progress.maxWatchedSeconds, l.durationSeconds),
    0,
  );
  const overallPercent =
    totalDuration === 0 ? 0 : Math.round((totalWatched / totalDuration) * 100);

  const saveProgress = (seconds: number, force = false) => {
    if (!trackProgress) return;

    if (!force && Math.abs(seconds - lastSavedRef.current) < 10) return;
    lastSavedRef.current = seconds;

    const lessonId = currentLesson.id;
    const positionSeconds = Math.floor(seconds);

    startTransition(() => {
      updateProgressAction(lessonId, positionSeconds).then((progress) => {
        if (!progress) return;
        setLessons((prev) =>
          prev.map((lesson) =>
            lesson.id === lessonId ? { ...lesson, progress } : lesson,
          ),
        );
      });
    });
  };

  const goToLesson = (index: number) => {
    if (videoRef.current) {
      saveProgress(videoRef.current.currentTime);
    }
    setCurrentIndex(index);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-foreground">
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <Logo light />
          <span className="hidden text-sm text-white/40 md:block">
            {data.course.title}
          </span>
        </div>
        {trackProgress ? (
          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end md:flex">
              <span className="text-xs text-white/50">Progress</span>
              <span className="text-sm font-bold text-white">
                {overallPercent}%
              </span>
            </div>
            <div className="hidden h-2 w-24 overflow-hidden rounded-full bg-white/20 md:block">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
            Instructor Preview
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 items-center justify-center bg-black">
            <video
              key={currentLesson.id}
              ref={videoRef}
              src={currentLesson.videoUrl}
              controls
              className="h-full w-full bg-black object-contain"
              onLoadedMetadata={(e) => {
                if (currentLesson.progress.lastPositionSeconds > 0) {
                  e.currentTarget.currentTime =
                    currentLesson.progress.lastPositionSeconds;
                }
              }}
              onTimeUpdate={(e) => saveProgress(e.currentTarget.currentTime)}
              onPause={(e) => saveProgress(e.currentTarget.currentTime, true)}
              onEnded={() => saveProgress(currentLesson.durationSeconds, true)}
            />
          </div>

          <div className="shrink-0 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {currentLesson.title}
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  Lesson {currentIndex + 1} of {lessons.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToLesson(Math.max(currentIndex - 1, 0))}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  <ArrowLeft size={14} />
                  Previous
                </button>
                <button
                  onClick={() =>
                    goToLesson(Math.min(currentIndex + 1, lessons.length - 1))
                  }
                  disabled={currentIndex === lessons.length - 1}
                  className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-white/10 bg-white/5 lg:block">
          <div className="border-b border-white/10 p-4">
            <h3 className="text-sm font-bold text-white">Course Content</h3>
            <p className="mt-0.5 text-xs text-white/50">
              {trackProgress
                ? `${completedCount}/${lessons.length} lessons completed`
                : `${lessons.length} lessons`}
            </p>
          </div>
          <div className="space-y-1 p-2">
            {lessons.map((lesson, index) => (
              <button
                key={lesson.id}
                onClick={() => goToLesson(index)}
                className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all ${
                  currentIndex === index
                    ? "border border-primary/40 bg-primary/30"
                    : "hover:bg-white/5"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    lesson.progress.isCompleted
                      ? "border-primary bg-primary"
                      : currentIndex === index
                        ? "border-primary"
                        : "border-white/30"
                  }`}
                >
                  {lesson.progress.isCompleted ? (
                    <Check size={12} className="text-white" />
                  ) : (
                    <span className="text-xs text-white/70">{index + 1}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-medium leading-snug ${
                      currentIndex === index ? "text-white" : "text-white/70"
                    }`}
                  >
                    {lesson.title}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-white/40">
                    <Play size={10} />
                    {formatDuration(lesson.durationSeconds)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
