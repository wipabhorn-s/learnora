"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCourseAction } from "@/lib/actions/course.action";
import {
  createLessonAction,
  moveLessonAction,
  removeLessonAction,
  updateLessonAction,
} from "@/lib/actions/lesson.action";
import { LessonResponse } from "@/lib/api/lesson.api";
import {
  CATEGORIES,
  CreateCourseInput,
  LEVELS,
  createCourseSchema,
} from "@/lib/schemas/course.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  GripVertical,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

const STEPS = ["Basic Info", "Pricing & Access", "Lessons", "Review"];

const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const CONTROL_CLASS =
  "h-[30px] rounded-lg border-primary/15 bg-secondary/40 px-3 text-sm shadow-none md:text-sm";
const STEP_BUTTON_CLASS = "h-10 w-40 px-4 text-sm sm:w-52";

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CreateCourseForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isFree, setIsFree] = useState(true);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [lessons, setLessons] = useState<LessonResponse[]>([]);
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [draggingLessonId, setDraggingLessonId] = useState<number | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonVideo, setLessonVideo] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const isUploadingVideo = isPending && isAddingLesson && lessonVideo !== null;

  const { control, getValues, handleSubmit, trigger, setValue } =
    useForm<CreateCourseInput>({
      resolver: zodResolver(createCourseSchema),
      mode: "onChange",
      reValidateMode: "onChange",
      defaultValues: {
        title: "",
        description: "",
        price: 0,
        accessType: "LIFETIME",
        accessDuration: undefined,
      },
    });

  const accessType = useWatch({
    control,
    name: "accessType",
  });

  useEffect(() => {
    return () => {
      if (thumbnailPreview) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  const goNext = async () => {
    setFormError(null);

    const isValid = await trigger([
      "title",
      "category",
      "level",
      "description",
    ]);

    if (isValid) {
      setStep(2);
    }
  };

  const handlePricingType = (type: "Free" | "Paid") => {
    const free = type === "Free";

    setIsFree(free);
    setFormError(null);

    if (free) {
      setValue("price", 0, {
        shouldValidate: true,
        shouldDirty: true,
      });

      return;
    }

  };

  const handleThumbnailChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setFormError("Please choose an image file");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_THUMBNAIL_SIZE) {
      setFormError("Thumbnail must be smaller than 5 MB");
      event.target.value = "";
      return;
    }

    setThumbnailFile(selectedFile);
    setThumbnailPreview(URL.createObjectURL(selectedFile));
    setFormError(null);
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);

    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }
  };

  const onSubmit = (data: CreateCourseInput) => {
    setFormError(null);

    if (!isFree && data.price <= 0) {
      setFormError("Paid course price must be greater than 0");
      return;
    }

    const formData = new FormData();

    formData.append("title", data.title);
    formData.append("description", data.description);
    formData.append("price", String(isFree ? 0 : data.price));
    formData.append("category", data.category);
    formData.append("level", data.level);
    formData.append("accessType", data.accessType);

    if (data.accessType === "LIMITED" && data.accessDuration !== undefined) {
      formData.append("accessDuration", String(data.accessDuration));
    }

    if (thumbnailFile) {
      formData.append("thumbnailUrl", thumbnailFile);
    }

    startTransition(async () => {
      const result = await createCourseAction(formData);

      if (result.success === false) {
        setFormError(result.message);
        return;
      }

      setCourseId(result.courseId);
      setStep(3);
    });
  };

  const selectLessonVideo = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("video/")) {
      setFormError("Please choose a video file");
      return false;
    }

    if (selectedFile.size > MAX_VIDEO_SIZE) {
      setFormError("Video must be smaller than 100 MB");
      return false;
    }

    setLessonVideo(selectedFile);
    setFormError(null);
    return true;
  };

  const handleVideoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    if (!selectLessonVideo(selectedFile)) {
      event.target.value = "";
    }
  };

  const handleVideoDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();

    const selectedFile = event.dataTransfer.files[0];
    if (selectedFile) selectLessonVideo(selectedFile);
  };

  const resetLessonForm = () => {
    setLessonTitle("");
    setLessonVideo(null);
    setEditingLessonId(null);
    setFormError(null);
    setIsAddingLesson(false);

    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const openLessonEditor = (lesson: LessonResponse) => {
    setLessonTitle(lesson.title);
    setLessonVideo(null);
    setEditingLessonId(lesson.id);
    setFormError(null);
    setIsAddingLesson(true);

    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const saveLesson = () => {
    if (!courseId) {
      setFormError("Course has not been created yet");
      return;
    }

    if (!lessonTitle.trim()) {
      setFormError("Lesson title is required");
      return;
    }

    if (!editingLessonId && !lessonVideo) {
      setFormError("Lesson video is required");
      return;
    }

    const formData = new FormData();
    formData.append("title", lessonTitle.trim());
    if (lessonVideo) formData.append("videoUrl", lessonVideo);

    setFormError(null);
    startTransition(async () => {
      const result = editingLessonId
        ? await updateLessonAction(editingLessonId, formData)
        : await createLessonAction(courseId, formData);

      if (!result.success) {
        setFormError(result.message);
        return;
      }

      setLessons((current) =>
        editingLessonId
          ? current.map((lesson) =>
              lesson.id === result.lesson.id ? result.lesson : lesson,
            )
          : [...current, result.lesson],
      );
      resetLessonForm();
    });
  };

  const removeLesson = (lesson: LessonResponse) => {
    if (!window.confirm(`Delete lesson "${lesson.title}"?`)) return;

    setFormError(null);
    startTransition(async () => {
      const result = await removeLessonAction(lesson.id);

      if (!result.success) {
        setFormError(result.message);
        return;
      }

      setLessons((current) =>
        current
          .filter((item) => item.id !== lesson.id)
          .map((item, index) => ({ ...item, orderNo: index + 1 })),
      );

      if (editingLessonId === lesson.id) resetLessonForm();
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

    const reorderedLessons = [...previousLessons];
    const [movedLesson] = reorderedLessons.splice(sourceIndex, 1);
    reorderedLessons.splice(targetIndex, 0, movedLesson);

    const nextLessons = reorderedLessons.map((lesson, index) => ({
      ...lesson,
      orderNo: index + 1,
    }));
    const movedLessonId = draggingLessonId;

    setLessons(nextLessons);
    setDraggingLessonId(null);
    setFormError(null);

    startTransition(async () => {
      const result = await moveLessonAction(movedLessonId, targetIndex + 1);

      if (!result.success) {
        setLessons(previousLessons);
        setFormError(result.message);
        return;
      }

      setLessons(result.lessons);
    });
  };

  const reviewData = getValues();

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full space-y-8"
      noValidate
    >
      {/* Stepper */}
      <div className="flex w-full items-center px-2 sm:px-8">
        {STEPS.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < step;
          const isActive = stepNumber === step;

          return (
            <div
              key={label}
              className="flex flex-1 items-center last:flex-none"
            >
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                    isCompleted
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : isActive
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check size={16} /> : stepNumber}
                </div>

                <span
                  className={`text-xs font-medium ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </div>

              {index < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    isCompleted ? "bg-emerald-500" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Basic Information */}
      {step === 1 && (
        <Card className="w-full p-6 sm:p-8">
          <FieldGroup className="gap-5">
            <div>
              <h2 className="font-bold">Step 1: Basic Information</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Add the main information students will see about your course.
              </p>
            </div>

            <Controller
              control={control}
              name="title"
              render={({ field, fieldState }) => (
                <Field className="gap-1" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Course Title</FieldLabel>

                  <Input
                    {...field}
                    id={field.name}
                    placeholder="e.g. Complete React Developer"
                    disabled={isPending}
                    className={CONTROL_CLASS}
                  />

                  {fieldState.invalid && (
                    <FieldError
                      className="text-xs"
                      errors={[fieldState.error]}
                    />
                  )}
                </Field>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                control={control}
                name="category"
                render={({ field, fieldState }) => (
                  <Field className="gap-1" data-invalid={fieldState.invalid}>
                    <FieldLabel>Category</FieldLabel>

                    <Select
                      value={field.value ?? null}
                      onValueChange={(value) => {
                        if (value) field.onChange(value);
                      }}
                      disabled={isPending}
                    >
                      <SelectTrigger
                        className={`w-full data-[size=default]:h-[30px] ${CONTROL_CLASS}`}
                      >
                        <SelectValue placeholder="Select category">
                          {(value) =>
                            typeof value === "string"
                              ? value.replaceAll("_", " ")
                              : "Select category"
                          }
                        </SelectValue>
                      </SelectTrigger>

                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.replaceAll("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {fieldState.invalid && (
                      <FieldError
                        className="text-xs"
                        errors={[fieldState.error]}
                      />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="level"
                render={({ field, fieldState }) => (
                  <Field className="gap-1" data-invalid={fieldState.invalid}>
                    <FieldLabel>Level</FieldLabel>

                    <Select
                      value={field.value ?? null}
                      onValueChange={(value) => {
                        if (value) field.onChange(value);
                      }}
                      disabled={isPending}
                    >
                      <SelectTrigger
                        className={`w-full data-[size=default]:h-[30px] ${CONTROL_CLASS}`}
                      >
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>

                      <SelectContent>
                        {LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {fieldState.invalid && (
                      <FieldError
                        className="text-xs"
                        errors={[fieldState.error]}
                      />
                    )}
                  </Field>
                )}
              />
            </div>

            <Controller
              control={control}
              name="description"
              render={({ field, fieldState }) => (
                <Field className="gap-1" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Course Description
                  </FieldLabel>

                  <Textarea
                    {...field}
                    id={field.name}
                    rows={5}
                    placeholder="Describe what students will learn..."
                    disabled={isPending}
                    className="h-[90px] min-h-[90px] max-h-[90px] resize-none rounded-lg border-primary/15 bg-secondary/40 px-3 py-2 text-sm shadow-none md:text-sm"
                  />

                  {fieldState.invalid && (
                    <FieldError
                      className="text-xs"
                      errors={[fieldState.error]}
                    />
                  )}
                </Field>
              )}
            />

            {/* Course thumbnail */}
            <Field className="gap-2">
              <div>
                <FieldLabel>Course Thumbnail</FieldLabel>
                <p className="text-xs text-muted-foreground">
                  Optional. Choose an image smaller than 5 MB.
                </p>
              </div>

              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleThumbnailChange}
              />

              {thumbnailPreview ? (
                <div className="relative h-48 overflow-hidden rounded-xl border bg-muted sm:h-56">
                  <Image
                    src={thumbnailPreview}
                    alt="Course thumbnail preview"
                    fill
                    unoptimized
                    className="object-cover"
                  />

                  <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-black/50 p-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => thumbnailInputRef.current?.click()}
                      disabled={isPending}
                    >
                      <ImagePlus />
                      Change
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={removeThumbnail}
                      disabled={isPending}
                    >
                      <X />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => thumbnailInputRef.current?.click()}
                  disabled={isPending}
                  className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-primary hover:bg-secondary hover:text-primary disabled:pointer-events-none disabled:opacity-50 sm:h-56"
                >
                  <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
                    <ImagePlus />
                  </span>

                  <span className="text-sm font-medium">
                    Click to upload thumbnail
                  </span>
                </button>
              )}
            </Field>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={goNext}
                disabled={isPending}
                className={STEP_BUTTON_CLASS}
              >
                Next
              </Button>
            </div>
          </FieldGroup>
        </Card>
      )}

      {/* Step 2: Pricing and Access */}
      {step === 2 && (
        <Card className="w-full p-6 sm:p-8">
          <FieldGroup className="gap-5">
            <div>
              <h2 className="font-bold">Step 2: Pricing & Access</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Set the course price and how long students can access it.
              </p>
            </div>

            {/* Free or Paid */}
            <Field className="gap-2">
              <FieldLabel>Pricing Type</FieldLabel>

              <div className="flex rounded-xl bg-muted p-1">
                {(["Free", "Paid"] as const).map((option) => {
                  const selected =
                    (option === "Free" && isFree) ||
                    (option === "Paid" && !isFree);

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handlePricingType(option)}
                      disabled={isPending}
                      className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 ${
                        selected
                          ? "bg-background text-primary shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </Field>

            {!isFree && (
              <Controller
                control={control}
                name="price"
                render={({ field, fieldState }) => (
                  <Field className="gap-1" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Price (฿)</FieldLabel>

                    <Input
                      {...field}
                      id={field.name}
                      type="number"
                      min={1}
                      step="0.01"
                      disabled={isPending}
                      className={CONTROL_CLASS}
                      value={field.value ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;

                        field.onChange(
                          value === "" ? 0 : event.target.valueAsNumber,
                        );
                      }}
                    />

                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            )}

            <Controller
              control={control}
              name="accessType"
              render={({ field }) => (
                <Field className="gap-1">
                  <FieldLabel>Access Type</FieldLabel>

                  <Select
                    value={field.value}
                    disabled={isPending}
                    onValueChange={(value) => {
                      field.onChange(value);

                      if (value === "LIFETIME") {
                        setValue("accessDuration", undefined, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                      }
                    }}
                  >
                    <SelectTrigger className={`w-full ${CONTROL_CLASS}`}>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="LIFETIME">Lifetime access</SelectItem>

                      <SelectItem value="LIMITED">Limited access</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            {accessType === "LIMITED" && (
              <Controller
                control={control}
                name="accessDuration"
                render={({ field, fieldState }) => (
                  <Field className="gap-1" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Duration (days)
                    </FieldLabel>

                    <Input
                      {...field}
                      id={field.name}
                      type="number"
                      min={1}
                      placeholder="30"
                      disabled={isPending}
                      className={CONTROL_CLASS}
                      value={field.value ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;

                        field.onChange(
                          value === "" ? undefined : event.target.valueAsNumber,
                        );
                      }}
                    />

                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            )}

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <div className="flex justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormError(null);
                  setStep(1);
                }}
                disabled={isPending}
                className={STEP_BUTTON_CLASS}
              >
                Back
              </Button>

              <Button
                type="submit"
                disabled={isPending}
                className={STEP_BUTTON_CLASS}
              >
                {isPending ? "Creating..." : "Create & Add Lessons"}
              </Button>
            </div>
          </FieldGroup>
        </Card>
      )}

      {/* Step 3: Lessons */}
      {step === 3 && (
        <Card className="w-full p-6 sm:p-8">
          <div className="space-y-6">
            <div>
              <div>
                <h2 className="font-bold">Step 3: Lessons</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add or edit lesson videos, then drag the lessons to reorder
                  them.
                </p>
              </div>
            </div>

            {lessons.length > 0 ? (
              <div className="space-y-3">
                {lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    draggable={!isPending && !isAddingLesson}
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
                    className={`flex cursor-grab items-center gap-3 rounded-xl border bg-background p-4 transition active:cursor-grabbing ${
                      draggingLessonId === lesson.id
                        ? "opacity-50"
                        : "hover:border-primary/40"
                    }`}
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
                    <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      Video uploaded
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openLessonEditor(lesson)}
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
              !isAddingLesson && (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No lessons yet. Click Add Lesson to upload the first video.
                </div>
              )
            )}

            {isAddingLesson && (
              <div className="overflow-hidden rounded-2xl border border-primary/15 bg-secondary/20">
                <div className="border-b border-primary/10 px-5 py-3 font-semibold">
                  {editingLessonId ? "Edit Lesson" : "New Lesson"}
                </div>

                <div className="space-y-5 p-5">
                  <Field className="gap-1">
                    <FieldLabel htmlFor="lesson-title">
                      Lesson Title
                    </FieldLabel>
                    <Input
                      id="lesson-title"
                      value={lessonTitle}
                      onChange={(event) => setLessonTitle(event.target.value)}
                      placeholder="e.g. Introduction to Hooks"
                      className={CONTROL_CLASS}
                      disabled={isPending}
                    />
                  </Field>

                  <Field className="gap-2">
                    <FieldLabel>
                      Video Upload {editingLessonId && "(optional)"}
                    </FieldLabel>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleVideoChange}
                    />
                    {isUploadingVideo ? (
                      <div className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-6 text-sm">
                        <Loader2 className="size-6 animate-spin text-primary" />
                        <p className="max-w-full truncate font-medium text-primary">
                          Uploading {lessonVideo!.name}
                        </p>
                        <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-primary/15">
                          <div className="animate-indeterminate-bar h-full w-1/3 rounded-full bg-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(lessonVideo!.size)} · Please keep this
                          page open
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
                          {lessonVideo
                            ? lessonVideo.name
                            : editingLessonId
                              ? "Keep the current video, or click/drag a replacement"
                              : "Click or drag a video file — duration is detected automatically"}
                        </span>
                        {lessonVideo && (
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(lessonVideo.size)}
                          </span>
                        )}
                      </button>
                    )}
                  </Field>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={saveLesson}
                      disabled={isPending}
                      className={STEP_BUTTON_CLASS}
                    >
                      {isPending && <Loader2 className="animate-spin" />}
                      {isUploadingVideo
                        ? "Uploading..."
                        : isPending
                          ? "Saving..."
                          : editingLessonId
                            ? "Save Lesson"
                            : "Add Lesson"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={resetLessonForm}
                      disabled={isPending}
                      className={STEP_BUTTON_CLASS}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {!isAddingLesson && (
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full border-dashed text-base"
                onClick={() => {
                  setFormError(null);
                  setEditingLessonId(null);
                  setIsAddingLesson(true);
                }}
                disabled={isPending || isAddingLesson}
              >
                <Plus />
                Add Lesson
              </Button>
            )}

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setStep(4);
                }}
                disabled={isPending}
                className={STEP_BUTTON_CLASS}
              >
                {lessons.length === 0 ? "Skip for now" : "Review Course"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card className="w-full p-6 sm:p-8">
          <div className="space-y-6">
            <div>
              <h2 className="font-bold">Step 4: Review</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Check your draft course before returning to My Courses.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-[minmax(220px,0.8fr)_2fr]">
              <div className="relative aspect-video overflow-hidden rounded-2xl bg-secondary">
                {thumbnailPreview ? (
                  <Image
                    src={thumbnailPreview}
                    alt="Course thumbnail"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No thumbnail
                  </div>
                )}
              </div>

              <dl className="grid content-start gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">Title</dt>
                  <dd className="text-lg font-semibold">{reviewData.title}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Category</dt>
                  <dd className="font-medium">
                    {reviewData.category.replaceAll("_", " ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Level</dt>
                  <dd className="font-medium">{reviewData.level}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Price</dt>
                  <dd className="font-medium">
                    {isFree ? "Free" : `฿${reviewData.price}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Lessons</dt>
                  <dd className="font-medium">{lessons.length}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">
                    Description
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm">
                    {reviewData.description}
                  </dd>
                </div>
              </dl>
            </div>

            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              The course is saved as DRAFT. You can publish it later from My
              Courses.
            </p>

            <div className="flex justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(3)}
                className={STEP_BUTTON_CLASS}
              >
                Back to Lessons
              </Button>
              <Button
                type="button"
                onClick={() => {
                  router.push("/instructor/courses");
                  router.refresh();
                }}
                className={STEP_BUTTON_CLASS}
              >
                Finish
              </Button>
            </div>
          </div>
        </Card>
      )}
    </form>
  );
}
