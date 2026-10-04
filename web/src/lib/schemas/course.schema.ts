import z from "zod";

export const CATEGORIES = [
  "PROGRAMMING",
  "BUSINESS",
  "DESIGN",
  "MARKETING",
  "PERSONAL_DEVELOPMENT",
  "LANGUAGE",
] as const;

export const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
export const ACCESS_TYPES = ["LIFETIME", "LIMITED"] as const;

export const MAX_LIST_ITEMS = 10;
export const MAX_LIST_ITEM_LENGTH = 160;

/** ช่องว่างถูกทิ้งตอนส่ง จึงตรวจแค่ความยาว */
const stringList = z.array(
  z
    .string()
    .max(
      MAX_LIST_ITEM_LENGTH,
      `Keep each item under ${MAX_LIST_ITEM_LENGTH} characters`,
    ),
);

export const createCourseSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    subtitle: z.string().max(160, "Subtitle must be 160 characters or fewer"),
    description: z.string().min(1, "Description is required"),
    learningOutcomes: stringList,
    requirements: stringList,
    price: z.number().min(0, "Price cannot be negative"),
    category: z.enum(CATEGORIES, { error: "Category is required" }),
    level: z.enum(LEVELS, { error: "Level is required" }),
    accessType: z.enum(["LIFETIME", "LIMITED"]),
    accessDuration: z.number().int().min(1).optional(),
  })
  .refine(
    (data) => data.accessType !== "LIMITED" || data.accessDuration != null,
    {
      message: "Duration is required for limited access",
      path: ["accessDuration"],
    },
  );

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
