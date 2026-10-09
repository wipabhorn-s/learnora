import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  // build ลงโฟลเดอร์อื่นได้ (เช่น NEXT_DIST_DIR=.next-build pnpm build) ตอน dev server
  // ยังรันอยู่ ถ้า build ทับ .next ที่ dev ใช้อยู่ dev server จะพัง (Turbopack panic)
  distDir: process.env.NEXT_DIST_DIR || ".next",

  experimental: {
    // อัปโหลดวิดีโอบทเรียนได้ถึง 100MB (API รับสูงสุด 100MB) เผื่อส่วนหัวของฟอร์มอีกนิด
    serverActions: {
      bodySizeLimit: "110mb",
    },
    // มี proxy.ts (ต่ออายุ session) Next จะอ่าน body ผ่าน proxy ก่อน ค่าเริ่มต้นแค่ 10MB
    // ต้องเท่ากับ bodySizeLimit ด้านบน ไม่งั้นวิดีโอเกิน 10MB ถูกตัดกลางทาง ("Unexpected end of form")
    proxyClientMaxBodySize: "110mb",
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(process.env.NODE_ENV !== "production"),
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
