import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  // build ลงโฟลเดอร์อื่นได้ (เช่น NEXT_DIST_DIR=.next-build pnpm build) ตอน dev server
  // ยังรันอยู่ ถ้า build ทับ .next ที่ dev ใช้อยู่ dev server จะพัง (Turbopack panic)
  distDir: process.env.NEXT_DIST_DIR || ".next",

  experimental: {
    serverActions: {
      bodySizeLimit: "110mb",
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
