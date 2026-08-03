"use client";

import EditLessons from "@/components/features/course/EditLessons";
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
import { updateCourseAction } from "@/lib/actions/course.action";
import type { InstructorCourseResponse } from "@/lib/api/course.api";
import type { LessonResponse } from "@/lib/api/lesson.api";
import {
  CATEGORIES,
  CreateCourseInput,
  LEVELS,
  createCourseSchema,
} from "@/lib/schemas/course.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ImagePlus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

const STEPS = ["Basic Info", "Pricing & Access", "Lessons", "Review"];
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024;
const CONTROL_CLASS =
  "h-[30px] rounded-lg border-primary/15 bg-secondary/40 px-3 text-sm shadow-none md:text-sm";
const STEP_BUTTON_CLASS = "h-10 w-40 px-4 text-sm sm:w-52";

export default function EditCourseForm({
  course,
}: {
  course: InstructorCourseResponse;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isFree, setIsFree] = useState(Number(course.price) === 0);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    course.thumbnailUrl,
  );
  const [lessons, setLessons] = useState<LessonResponse[]>(course.lessons);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const {
    control,
    formState: { dirtyFields },
    getValues,
    reset,
    setValue,
    trigger,
  } = useForm<CreateCourseInput>({
    resolver: zodResolver(createCourseSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      title: course.title,
      description: course.description,
      price: Number(course.price),
      category: course.category as CreateCourseInput["category"],
      level: course.level as CreateCourseInput["level"],
      accessType: course.accessType,
      accessDuration: course.accessDuration ?? undefined,
    },
  });

  const accessType = useWatch({ control, name: "accessType" });

  useEffect(() => {
    return () => {
      if (thumbnailPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  const handleThumbnailChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please choose an image file");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_THUMBNAIL_SIZE) {
      setFormError("Thumbnail must be smaller than 5 MB");
      event.target.value = "";
      return;
    }

    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
    setFormError(null);
    setSavedMessage(null);
  };

  const saveBasicInfo = async () => {
    setFormError(null);
    setSavedMessage(null);

    const valid = await trigger([
      "title",
      "category",
      "level",
      "description",
    ]);
    if (!valid) return;

    const changed =
      dirtyFields.title ||
      dirtyFields.category ||
      dirtyFields.level ||
      dirtyFields.description ||
      thumbnailFile !== null;

    if (!changed) {
      setStep(2);
      return;
    }

    const values = getValues();
    const formData = new FormData();
    formData.set("title", values.title);
    formData.set("category", values.category);
    formData.set("level", values.level);
    formData.set("description", values.description);
    if (thumbnailFile) formData.set("thumbnailUrl", thumbnailFile);

    startTransition(async () => {
      const result = await updateCourseAction(course.id, formData);

      if (!result.success) {
        setFormError(result.message);
        return;
      }

      reset(values);
      setThumbnailFile(null);
      setThumbnailPreview(result.course.thumbnailUrl);
      setSavedMessage("Basic information saved");
      setStep(2);
    });
  };

  const handlePricingType = (type: "Free" | "Paid") => {
    const free = type === "Free";
    setIsFree(free);
    setFormError(null);
    setSavedMessage(null);

    if (free) {
      setValue("price", 0, { shouldDirty: true, shouldValidate: true });
    }
  };

  const savePricing = () => {
    setFormError(null);
    setSavedMessage(null);

    const values = getValues();
    if (!isFree && values.price <= 0) {
      setFormError("Paid course price must be greater than 0");
      return;
    }

    if (values.accessType === "LIMITED" && !values.accessDuration) {
      setFormError("Duration is required for limited access");
      return;
    }

    const changed =
      dirtyFields.price ||
      dirtyFields.accessType ||
      dirtyFields.accessDuration;

    if (!changed) {
      setStep(3);
      return;
    }

    const formData = new FormData();
    formData.set("price", String(isFree ? 0 : values.price));
    formData.set("accessType", values.accessType);
    if (values.accessType === "LIMITED" && values.accessDuration) {
      formData.set("accessDuration", String(values.accessDuration));
    }

    startTransition(async () => {
      const result = await updateCourseAction(course.id, formData);

      if (!result.success) {
        setFormError(result.message);
        return;
      }

      reset(values);
      setSavedMessage("Pricing and access saved");
      setStep(3);
    });
  };

  const reviewData = getValues();

  return (
    <div className="w-full space-y-8">
      <div className="flex w-full items-center px-2 sm:px-8">
        {STEPS.map((label, index) => {
          const stepNumber = index + 1;
          const completed = stepNumber < step;
          const active = stepNumber === step;

          return (
            <div
              key={label}
              className="flex flex-1 items-center last:flex-none"
            >
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <div
                  className={`flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold ${
                    completed
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : active
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {completed ? <Check size={16} /> : stepNumber}
                </div>
                <span
                  className={`text-xs font-medium ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    completed ? "bg-emerald-500" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <Card className="w-full p-6 sm:p-8">
          <FieldGroup className="gap-5">
            <div>
              <h2 className="font-bold">Step 1: Basic Information</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Update the information students see about this course.
              </p>
            </div>

            <Controller
              control={control}
              name="title"
              render={({ field, fieldState }) => (
                <Field className="gap-1" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Course Title</FieldLabel>
                  <Input {...field} id={field.name} className={CONTROL_CLASS} />
                  {fieldState.invalid && (
                    <FieldError className="text-xs" errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={control}
                name="category"
                render={({ field, fieldState }) => (
                  <Field className="gap-1" data-invalid={fieldState.invalid}>
                    <FieldLabel>Category</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        className={`w-full data-[size=default]:h-[30px] ${CONTROL_CLASS}`}
                      >
                        <SelectValue>
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
                      <FieldError className="text-xs" errors={[fieldState.error]} />
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        className={`w-full data-[size=default]:h-[30px] ${CONTROL_CLASS}`}
                      >
                        <SelectValue />
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
                      <FieldError className="text-xs" errors={[fieldState.error]} />
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
                  <FieldLabel htmlFor={field.name}>Course Description</FieldLabel>
                  <Textarea
                    {...field}
                    id={field.name}
                    className="h-[90px] min-h-[90px] max-h-[90px] resize-none rounded-lg border-primary/15 bg-secondary/40 px-3 py-2 text-sm shadow-none md:text-sm"
                  />
                  {fieldState.invalid && (
                    <FieldError className="text-xs" errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Field className="gap-2">
              <div>
                <FieldLabel>Course Thumbnail</FieldLabel>
                <p className="text-xs text-muted-foreground">
                  Optional. Upload a new image only when you want to replace it.
                </p>
              </div>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleThumbnailChange}
              />
              <button
                type="button"
                onClick={() => thumbnailInputRef.current?.click()}
                className="relative h-48 w-full overflow-hidden rounded-xl border border-dashed bg-muted/40 sm:h-56"
              >
                {thumbnailPreview ? (
                  <Image
                    src={thumbnailPreview}
                    alt="Course thumbnail"
                    fill
                    unoptimized={thumbnailPreview.startsWith("blob:")}
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                    <ImagePlus />
                    Click to upload thumbnail
                  </span>
                )}
                {thumbnailPreview && (
                  <span className="absolute inset-x-0 bottom-0 bg-black/55 py-2 text-sm text-white">
                    Click to change thumbnail
                  </span>
                )}
              </button>
            </Field>

            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={saveBasicInfo}
                disabled={isPending}
                className={STEP_BUTTON_CLASS}
              >
                {isPending ? "Saving..." : "Save & Next"}
              </Button>
            </div>
          </FieldGroup>
        </Card>
      )}

      {step === 2 && (
        <Card className="w-full p-6 sm:p-8">
          <FieldGroup className="gap-5">
            <div>
              <h2 className="font-bold">Step 2: Pricing & Access</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Update the price and course access period.
              </p>
            </div>

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
                      className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
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
                      min={0}
                      className={CONTROL_CLASS}
                      value={field.value ?? ""}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value === ""
                            ? 0
                            : event.target.valueAsNumber,
                        )
                      }
                    />
                    {fieldState.invalid && (
                      <FieldError className="text-xs" errors={[fieldState.error]} />
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
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value === "LIFETIME") {
                        setValue("accessDuration", undefined, {
                          shouldDirty: true,
                          shouldValidate: true,
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
                    <FieldLabel htmlFor={field.name}>Duration (days)</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="number"
                      min={1}
                      className={CONTROL_CLASS}
                      value={field.value ?? ""}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value === ""
                            ? undefined
                            : event.target.valueAsNumber,
                        )
                      }
                    />
                    {fieldState.invalid && (
                      <FieldError className="text-xs" errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            )}

            {formError && <p className="text-sm text-destructive">{formError}</p>}
            {savedMessage && (
              <p className="text-sm text-emerald-600">{savedMessage}</p>
            )}

            <div className="flex justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isPending}
                className={STEP_BUTTON_CLASS}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={savePricing}
                disabled={isPending}
                className={STEP_BUTTON_CLASS}
              >
                {isPending ? "Saving..." : "Save & Continue"}
              </Button>
            </div>
          </FieldGroup>
        </Card>
      )}

      {step === 3 && (
        <Card className="w-full p-6 sm:p-8">
          <EditLessons
            courseId={course.id}
            lessons={lessons}
            onLessonsChange={setLessons}
            onBack={() => setStep(2)}
            onContinue={() => setStep(4)}
          />
        </Card>
      )}

      {step === 4 && (
        <Card className="w-full p-6 sm:p-8">
          <div className="space-y-6">
            <div>
              <h2 className="font-bold">Step 4: Review</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Review the updated course information.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-[minmax(220px,0.8fr)_2fr]">
              <div className="relative aspect-video overflow-hidden rounded-2xl bg-secondary">
                {thumbnailPreview ? (
                  <Image
                    src={thumbnailPreview}
                    alt="Course thumbnail"
                    fill
                    unoptimized={thumbnailPreview.startsWith("blob:")}
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
                  <dt className="text-sm text-muted-foreground">Status</dt>
                  <dd className="font-medium">{course.status}</dd>
                </div>
              </dl>
            </div>

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
    </div>
  );
}
