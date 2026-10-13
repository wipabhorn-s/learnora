import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  // build ลงโฟลเดอร์อื่นได้ (เช่น NEXT_DIST_DIR=.next-build pnpm build) ตอน dev server
  // ยังรันอยู่ ถ้า build ทับ .next ที่ dev ใช้อยู่ dev server จะพัง (Turbopack panic)
  distDir: process.env.NEXT_DIST_DIR || ".next",

  experimental: {
    // ที่ส่งผ่าน server action มีแค่รูปปก/รูปโปรไฟล์ ซึ่งครอปเป็น JPEG ในเบราว์เซอร์แล้ว (ไม่ถึง 1MB)
    // วิดีโอบทเรียนอัปโหลดจากเบราว์เซอร์ตรงไป Cloudinary (lib/upload-video.ts) ไม่ผ่านตรงนี้
    // 4MB = ต่ำกว่าเพดาน 4.5MB ของ Vercel และต่ำกว่าเพดาน 10MB ของ proxy.ts
    serverActions: {
      bodySizeLimit: "4mb",
    },
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
