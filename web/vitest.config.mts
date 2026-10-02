import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // ตรงกับ paths ใน tsconfig.json
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // jsdom ให้ test คอมโพเนนต์ได้ (มี document/window) ฟังก์ชันล้วนก็รันได้ปกติ
    environment: "jsdom",
    setupFiles: ["./vitest.setup.tsx"],
    include: ["src/**/*.test.{ts,tsx}"],
    // lib/env.ts ตรวจ env ตอนโหลดไฟล์ ค่าหลอกพวกนี้ให้ import โมดูลได้
    // (test ไม่ได้เรียก API หรือ Google จริง)
    env: {
      API_URL: "http://localhost:8000",
      AUTH_SECRET: "test-secret",
      GOOGLE_CLIENT_ID: "test-google-client",
      GOOGLE_CLIENT_SECRET: "test-google-secret",
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: "test-google-client",
      NEXT_PUBLIC_OMISE_PUBLIC_KEY: "pkey_test_dummy",
    },
  },
});
