import z from "zod";

const envSchema = z.object({
  API_URL: z.url(),
  AUTH_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().min(1),
  NEXT_PUBLIC_OMISE_PUBLIC_KEY: z.string().trim().min(1),
});

const parsed = envSchema.safeParse({
  API_URL: process.env.API_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  NEXT_PUBLIC_OMISE_PUBLIC_KEY: process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY,
});

if (!parsed.success) {
  throw new Error(`Env validation failed\n${z.prettifyError(parsed.error)}\n`);
}

export const env = parsed.data;
