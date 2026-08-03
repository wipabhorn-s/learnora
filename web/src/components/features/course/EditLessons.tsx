"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  createLessonAction,
  moveLessonAction,
  removeLessonAction,
  updateLessonAction,
} from "@/lib/actions/lesson.action";
import type { LessonResponse } from "@/lib/api/lesson.api";
import {
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { ChangeEvent, DragEvent, useRef, useState, useTransition } from "react";

const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const CONTROL_CLASS =
  "h-[30px] rounded-lg border-primary/15 bg-secondary/40 px-3 text-sm shadow-none md:text-sm";
const BUTTON_CLASS = "h-10 w-40 px-4 text-sm sm:w-52";

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EditLessons({
  courseId,
  lessons,
  onLessonsChange,
  onBack,
  onContinue,
}: {
  courseId: number;
  lessons: LessonResponse[];
  onLessonsChange: (lessons: LessonResponse[]) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [mode, setMode] = useState<"add" | "edit" | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [draggingLessonId, setDraggingLessonId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const isUploading = isPending && mode !== null && videoFile !== null;

  const resetEditor = () => {
    setMode(null);
    setEditingLessonId(null);
    setTitle("");
    setVideoFile(null);
    setError(null);

    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const openAdd = () => {
    resetEditor();
    setMode("add");
  };

  const openEdit = (lesson: LessonResponse) => {
    resetEditor();
    setMode("edit");
    setEditingLessonId(lesson.id);
    setTitle(lesson.title);
  };

  const selectVideo = (file: File) => {
    if (!file.type.startsWith("video/")) {
      setError("Please choose a video file");
      return false;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setError("Video must be smaller than 100 MB");
      return false;
    }

    setVideoFile(file);
    setError(null);
    return true;
  };

  const handleVideoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && !selectVideo(file)) event.target.value = "";
  };

  const handleVideoDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) selectVideo(file);
  };

  const saveLesson = () => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Lesson title is required");
      return;
    }

    if (mode === "add" && !videoFile) {
      setError("Lesson video is required");
      return;
    }

    const formData = new FormData();
    formData.set("title", trimmedTitle);
    if (videoFile) formData.set("videoUrl", videoFile);

    setError(null);
    startTransition(async () => {
      const result =
        mode === "edit" && editingLessonId
          ? await updateLessonAction(editingLessonId, formData)
          : await createLessonAction(courseId, formData);

      if (!result.success) {
        setError(result.message);
        return;
      }

      if (mode === "edit") {
        onLessonsChange(
          lessons.map((lesson) =>
            lesson.id === result.lesson.id ? result.lesson : lesson,
          ),
        );
      } else {
        onLessonsChange([...lessons, result.lesson]);
      }

      resetEditor();
    });
  };

  const removeLesson = (lesson: LessonResponse) => {
    if (!window.confirm(`Delete lesson "${lesson.title}"?`)) return;

    setError(null);
    startTransition(async () => {
      const result = await removeLessonAction(lesson.id);

      if (!result.success) {
        setError(result.message);
        return;
      }

      onLessonsChange(
        lessons
          .filter((item) => item.id !== lesson.id)
          .map((item, index) => ({ ...item, orderNo: index + 1 })),
      );

      if (editingLessonId === lesson.id) resetEditor();
    });
  };

  const handleLessonDrop = (targetLessonId: number) => {
    if (!draggingLessonId || draggingLessonId === targetLessonId) {
      setDraggingLessonId(null);
      return;
    }

    const previousLessons = [...lessons];
    const sourceIndex = previousLessons.findIndex(
      (lesson) => lesson.id === draggingLessonId,
    );
    const targetIndex = previousLessons.findIndex(
      (lesson) => lesson.id === targetLessonId,
    );

    if (sourceIndex === -1 || targetIndex === -1) return;

    const reordered = [...previousLessons];
    const [movedLesson] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, movedLesson);

    const nextLessons = reordered.map((lesson, index) => ({
      ...lesson,
      orderNo: index + 1,
    }));
    const movedLessonId = draggingLessonId;

    onLessonsChange(nextLessons);
    setDraggingLessonId(null);
    setError(null);

    startTransition(async () => {
      const result = await moveLessonAction(movedLessonId, targetIndex + 1);

      if (!result.success) {
        onLessonsChange(previousLessons);
        setError(result.message);
        return;
      }

      onLessonsChange(result.lessons);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold">Step 3: Lessons</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add, edit, delete, or drag lessons to update their order.
        </p>
      </div>

      {lessons.length > 0 ? (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              draggable={!isPending && mode === null}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                setDraggingLessonId(lesson.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleLessonDrop(lesson.id);
              }}
              onDragEnd={() => setDraggingLessonId(null)}
              className={`flex items-center gap-3 rounded-xl border bg-background p-4 transition ${
                mode === null ? "cursor-grab active:cursor-grabbing" : ""
              } ${draggingLessonId === lesson.id ? "opacity-50" : ""}`}
            >
              <GripVertical className="size-5 shrink-0 text-muted-foreground" />
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary">
                {lesson.orderNo}
              </span>
              <Video className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{lesson.title}</p>
                <p className="text-xs text-muted-foreground">
                  {lesson.durationSeconds} seconds
                </p>
              </div>
              <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 sm:inline-flex">
                Video uploaded
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => openEdit(lesson)}
                disabled={isPending}
                aria-label={`Edit ${lesson.title}`}
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => removeLesson(lesson)}
                disabled={isPending}
                aria-label={`Delete ${lesson.title}`}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        mode === null && (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No lessons yet. Click Add Lesson to upload the first video.
          </div>
        )
      )}

      {mode && (
        <div className="overflow-hidden rounded-2xl border border-primary/15 bg-secondary/20">
          <div className="border-b border-primary/10 px-5 py-3 font-semibold">
            {mode === "add" ? "New Lesson" : "Edit Lesson"}
          </div>
          <div className="space-y-5 p-5">
            <Field className="gap-1">
              <FieldLabel htmlFor="lesson-title">Lesson Title</FieldLabel>
              <Input
                id="lesson-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={CONTROL_CLASS}
                disabled={isPending}
              />
            </Field>

            <Field className="gap-2">
              <FieldLabel>
                Video Upload {mode === "edit" && "(optional)"}
              </FieldLabel>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoChange}
              />
              {isUploading ? (
                <div className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-6 text-sm">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <p className="max-w-full truncate font-medium text-primary">
                    Uploading {videoFile!.name}
                  </p>
                  <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-primary/15">
                    <div className="animate-indeterminate-bar h-full w-1/3 rounded-full bg-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(videoFile!.size)} · Please keep this page
                    open
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleVideoDrop}
                  disabled={isPending}
                  className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/20 bg-background px-6 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-50"
                >
                  <Upload className="size-6" />
                  <span className="max-w-full truncate">
                    {videoFile
                      ? videoFile.name
                      : mode === "edit"
                        ? "Keep the current video, or click/drag a replacement"
                        : "Click or drag a video file"}
                  </span>
                  {videoFile && (
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(videoFile.size)}
                    </span>
                  )}
                </button>
              )}
            </Field>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={saveLesson}
                disabled={isPending}
                className={BUTTON_CLASS}
              >
                {isPending && <Loader2 className="animate-spin" />}
                {isUploading
                  ? "Uploading..."
                  : isPending
                    ? "Saving..."
                    : mode === "add"
                      ? "Add Lesson"
                      : "Save Lesson"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={resetEditor}
                disabled={isPending}
                className={BUTTON_CLASS}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {mode === null && (
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full border-dashed text-base"
          onClick={openAdd}
          disabled={isPending}
        >
          <Plus />
          Add Lesson
        </Button>
      )}

      {error && mode === null && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isPending || mode !== null}
          className={BUTTON_CLASS}
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={isPending || mode !== null}
          className={BUTTON_CLASS}
        >
          Review Course
        </Button>
      </div>
    </div>
  );
}
