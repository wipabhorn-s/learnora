"use client";

import StringListInput from "@/components/features/course/StringListInput";
import ImageCropDialog from "@/components/shared/ImageCropDialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  RequiredFieldsNote,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  createCourseAction,
  updateCourseAction,
} from "@/lib/actions/course.action";
import type { InstructorCourseResponse } from "@/lib/api/course.api";
import { formatEnum } from "@/lib/format";
import {
  CATEGORIES,
  CreateCourseInput,
  LEVELS,
  MAX_LIST_ITEMS,
  MAX_LIST_ITEM_LENGTH,
  createCourseSchema,
} from "@/lib/schemas/course.schema";
import { toast } from "@/lib/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

/** รูปต้นฉบับใหญ่ได้ (ไม่ได้อัปโหลดตรง) เพราะตัดเป็น 16:9 ขนาดไม่เกิน 1280×720 ก่อนส่ง */
const MAX_THUMBNAIL_SOURCE_SIZE = 15 * 1024 * 1024;

/** ให้ Select สูงและหน้าตาเท่ากับ Input มาตรฐานของเว็บ (44px) */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  // จอกว้าง: หัวข้อซ้าย ช่องกรอกขวา การ์ดจึงกว้างเท่าหน้าอื่นได้โดยช่องกรอก
  // ไม่ยืดยาวเกินอ่าน จอแคบ: หัวข้ออยู่บน ช่องกรอกอยู่ล่าง
  return (
    <section className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid min-w-0 gap-5">{children}</div>
    </section>
  );
}

/**
 * ข้อมูลคอร์สทั้งหมดในฟอร์มเดียว ใช้ทั้งตอนสร้าง (ไม่มี course) และแท็บ
 * Details ในหน้า builder (มี course) เดิมแยกเป็นสองไฟล์ที่ซ้ำกันเกือบทั้งหมด
 */
export default function CourseDetailsForm({
  course,
}: {
  course?: InstructorCourseResponse;
}) {
  const isEdit = course !== undefined;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isFree, setIsFree] = useState(
    course ? Number(course.price) === 0 : false,
  );
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    course?.thumbnailUrl ?? null,
  );
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  // รูปที่เพิ่งเลือก รอครอปในหน้าต่าง (ยังไม่ใช่รูปปกจนกว่าจะกด Apply)
  const [cropSource, setCropSource] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    clearErrors,
    formState: { isDirty },
  } = useForm<CreateCourseInput>({
    resolver: zodResolver(createCourseSchema),
    // ตรวจซ้ำตอนกดบันทึก ระหว่างแก้ช่องไหน กรอบแดงของช่องนั้นหายทันที
    reValidateMode: "onSubmit",
    defaultValues: {
      title: course?.title ?? "",
      subtitle: course?.subtitle ?? "",
      description: course?.description ?? "",
      learningOutcomes: course?.learningOutcomes ?? [],
      requirements: course?.requirements ?? [],
      price: course ? Number(course.price) : 0,
      category: course?.category as CreateCourseInput["category"],
      level: course?.level as CreateCourseInput["level"],
      accessType: course?.accessType ?? "LIFETIME",
      accessDuration: course?.accessDuration ?? undefined,
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
      setThumbnailError("Please choose an image file");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_THUMBNAIL_SOURCE_SIZE) {
      setThumbnailError("Image must be smaller than 15 MB");
      event.target.value = "";
      return;
    }

    setThumbnailError(null);
    setCropSource(URL.createObjectURL(file));
    // เลือกไฟล์เดิมซ้ำได้ (เช่นกดยกเลิกแล้วอยากครอปใหม่)
    event.target.value = "";
  };

  const closeCrop = () => {
    if (cropSource) URL.revokeObjectURL(cropSource);
    setCropSource(null);
  };

  const applyCrop = (file: File) => {
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
    closeCrop();
  };

  const choosePricing = (free: boolean) => {
    setIsFree(free);
    clearErrors("price");
    setValue("price", free ? 0 : Number(course?.price) || 0, {
      shouldDirty: true,
    });
  };

  const onSubmit = (data: CreateCourseInput) => {
    if (!isFree && data.price <= 0) {
      setError("price", { message: "Enter a price greater than 0" });
      return;
    }

    const formData = new FormData();
    const cleanList = (list: string[]) =>
      JSON.stringify(list.map((item) => item.trim()).filter(Boolean));

    formData.set("title", data.title);
    formData.set("subtitle", data.subtitle.trim());
    formData.set("description", data.description);
    // multipart ส่ง array ไม่ได้ ส่งเป็น JSON แล้ว API แปลงกลับ
    formData.set("learningOutcomes", cleanList(data.learningOutcomes));
    formData.set("requirements", cleanList(data.requirements));
    formData.set("category", data.category);
    formData.set("level", data.level);
    formData.set("price", String(isFree ? 0 : data.price));
    formData.set("accessType", data.accessType);
    if (data.accessType === "LIMITED" && data.accessDuration) {
      formData.set("accessDuration", String(data.accessDuration));
    }
    if (thumbnailFile) formData.set("thumbnailUrl", thumbnailFile);

    startTransition(async () => {
      if (!isEdit) {
        const result = await createCourseAction(formData);
        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success("Course created as a draft. Now add your first lesson.");
        router.push(`/instructor/courses/${result.courseId}/edit`);
        return;
      }

      const result = await updateCourseAction(course.id, formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      reset(data);
      setThumbnailFile(null);
      setThumbnailPreview(result.course.thumbnailUrl);
      toast.success("Course details saved");
      router.refresh();
    });
  };

  const canSave = !isEdit || isDirty || thumbnailFile !== null;

  return (
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-8"
    >
      <RequiredFieldsNote className="-mb-4" />
      <Section
        title="Basic information"
        description="What students see first when they find your course."
      >
        <Controller
          control={control}
          name="title"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel required htmlFor={field.name}>
                Course title
              </FieldLabel>
              <Input
                {...field}
                onChange={(event) => {
                  field.onChange(event);
                  clearErrors(field.name);
                }}
                id={field.name}
                placeholder="Enter course title"
                disabled={isPending}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={control}
          name="subtitle"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel optional htmlFor={field.name}>
                Subtitle
              </FieldLabel>
              <FieldDescription>
                One sentence shown under the title on the course page.
              </FieldDescription>
              <Input
                {...field}
                onChange={(event) => {
                  field.onChange(event);
                  clearErrors(field.name);
                }}
                id={field.name}
                maxLength={160}
                placeholder="Enter course subtitle"
                disabled={isPending}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Controller
            control={control}
            name="category"
            render={({ field, fieldState }) => (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel required>Category</FieldLabel>
                <Select
                  value={field.value ?? null}
                  onValueChange={(value) => {
                    field.onChange(value);
                    clearErrors(field.name);
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder="Select a category">
                      {(value) =>
                        typeof value === "string"
                          ? formatEnum(value)
                          : "Select a category"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {formatEnum(category)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={control}
            name="level"
            render={({ field, fieldState }) => (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel required>Level</FieldLabel>
                <Select
                  value={field.value ?? null}
                  onValueChange={(value) => {
                    field.onChange(value);
                    clearErrors(field.name);
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder="Select a level">
                      {(value) =>
                        typeof value === "string"
                          ? formatEnum(value)
                          : "Select a level"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {formatEnum(level)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        <Controller
          control={control}
          name="description"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel required htmlFor={field.name}>
                Description
              </FieldLabel>
              <Textarea
                {...field}
                onChange={(event) => {
                  field.onChange(event);
                  clearErrors(field.name);
                }}
                id={field.name}
                rows={5}
                placeholder="Enter course description"
                disabled={isPending}
                aria-invalid={fieldState.invalid}
                className="min-h-32 resize-y"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Field className="gap-1.5" data-invalid={thumbnailError !== null}>
          <FieldLabel optional>Thumbnail</FieldLabel>
          <FieldDescription>
            Any image up to 15 MB. You can zoom and reposition it to fit 16:9.
          </FieldDescription>
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
            disabled={isPending}
            className="group relative aspect-video w-full max-w-md overflow-hidden rounded-xl border border-dashed border-primary/25 bg-muted transition-colors hover:border-primary"
          >
            {thumbnailPreview ? (
              <>
                <Image
                  src={thumbnailPreview}
                  alt="Course thumbnail"
                  fill
                  unoptimized={thumbnailPreview.startsWith("blob:")}
                  className="object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 bg-black/55 py-2 text-sm text-white">
                  Click to change
                </span>
              </>
            ) : (
              <span className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground group-hover:text-primary">
                <ImagePlus size={28} />
                Click to upload a thumbnail
              </span>
            )}
          </button>
          {thumbnailError && (
            <p className="text-sm text-destructive">{thumbnailError}</p>
          )}
          <ImageCropDialog
            src={cropSource}
            title="Adjust thumbnail"
            description="Drag and zoom so the important part sits inside the frame. This is how the course card will look."
            aspect={16 / 9}
            maxWidth={1280}
            maxHeight={720}
            fileName="thumbnail.jpg"
            onCancel={closeCrop}
            onApply={applyCrop}
          />
        </Field>
      </Section>

      <Separator />

      <Section
        title="Course goals"
        description="Helps students decide whether this course is right for them."
      >
        <Controller
          control={control}
          name="learningOutcomes"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel optional htmlFor="learningOutcomes">
                {"What you'll learn"}
              </FieldLabel>
              <FieldDescription>
                What students will be able to do after finishing. Up to{" "}
                {MAX_LIST_ITEMS} items.
              </FieldDescription>
              <StringListInput
                id="learningOutcomes"
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  clearErrors(field.name);
                }}
                placeholder="Enter a learning outcome"
                addLabel="Add an outcome"
                maxItems={MAX_LIST_ITEMS}
                maxLength={MAX_LIST_ITEM_LENGTH}
                disabled={isPending}
                invalid={fieldState.invalid}
              />
              {/* error ของ array อยู่รายข้อ ไม่ใช่ที่ตัว field จึงเขียนข้อความเอง */}
              {fieldState.invalid && (
                <FieldError
                  errors={[
                    {
                      message: `Keep each item under ${MAX_LIST_ITEM_LENGTH} characters`,
                    },
                  ]}
                />
              )}
            </Field>
          )}
        />
        <Controller
          control={control}
          name="requirements"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel optional htmlFor="requirements">
                Requirements
              </FieldLabel>
              <FieldDescription>
                Skills or tools students need before starting. Up to{" "}
                {MAX_LIST_ITEMS} items.
              </FieldDescription>
              <StringListInput
                id="requirements"
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  clearErrors(field.name);
                }}
                placeholder="Enter a requirement"
                addLabel="Add a requirement"
                maxItems={MAX_LIST_ITEMS}
                maxLength={MAX_LIST_ITEM_LENGTH}
                disabled={isPending}
                invalid={fieldState.invalid}
              />
              {/* error ของ array อยู่รายข้อ ไม่ใช่ที่ตัว field จึงเขียนข้อความเอง */}
              {fieldState.invalid && (
                <FieldError
                  errors={[
                    {
                      message: `Keep each item under ${MAX_LIST_ITEM_LENGTH} characters`,
                    },
                  ]}
                />
              )}
            </Field>
          )}
        />
      </Section>

      <Separator />

      <Section
        title="Pricing & access"
        description="How much the course costs and how long students keep it."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field className="gap-1.5">
            <FieldLabel required>Pricing</FieldLabel>
            <SegmentedControl
              fullWidth
              options={[
                { value: true, label: "Free" },
                { value: false, label: "Paid" },
              ]}
              value={isFree}
              onChange={choosePricing}
              disabled={isPending}
            />
          </Field>

          {isFree ? (
            // ช่องเดิมยังอยู่ที่เดิม layout จึงไม่กระโดดตอนสลับ Free / Paid
            <Field className="gap-1.5">
              <FieldLabel htmlFor="price-free">Price (฿)</FieldLabel>
              <Input id="price-free" value="Free" disabled readOnly />
            </Field>
          ) : (
            <Controller
              control={control}
              name="price"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel required htmlFor={field.name}>
                    Price (฿)
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder="Enter price"
                    disabled={isPending}
                    aria-invalid={fieldState.invalid}
                    value={field.value || ""}
                    onChange={(event) => {
                      field.onChange(
                        event.target.value === ""
                          ? 0
                          : event.target.valueAsNumber,
                      );
                      clearErrors(field.name);
                    }}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Controller
            control={control}
            name="accessType"
            render={({ field }) => (
              <Field className="gap-1.5">
                <FieldLabel required>Access</FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    clearErrors("accessDuration");
                    if (value === "LIFETIME") {
                      setValue("accessDuration", undefined, {
                        shouldDirty: true,
                      });
                    }
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value) =>
                        value === "LIMITED" ? "Limited time" : "Lifetime access"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIFETIME">Lifetime access</SelectItem>
                    <SelectItem value="LIMITED">Limited time</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          {accessType !== "LIMITED" ? (
            <Field className="gap-1.5">
              <FieldLabel htmlFor="access-lifetime">
                Access length (days)
              </FieldLabel>
              <Input
                id="access-lifetime"
                value="No time limit"
                disabled
                readOnly
              />
            </Field>
          ) : (
            <Controller
              control={control}
              name="accessDuration"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel required htmlFor={field.name}>
                    Access length (days)
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder="Enter number of days"
                    disabled={isPending}
                    aria-invalid={fieldState.invalid}
                    value={field.value ?? ""}
                    onChange={(event) => {
                      field.onChange(
                        event.target.value === ""
                          ? undefined
                          : event.target.valueAsNumber,
                      );
                      clearErrors(field.name);
                    }}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          )}
        </div>
      </Section>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-6">
        {!isEdit && (
          <Link
            href="/instructor/courses"
            className="px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Link>
        )}
        <Button
          type="submit"
          disabled={isPending || !canSave}
          className="h-11 rounded-xl px-8 text-sm font-semibold"
        >
          {isPending
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
              ? "Save changes"
              : "Create course"}
        </Button>
      </div>
    </form>
  );
}
