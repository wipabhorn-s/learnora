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

export const createCourseSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
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
