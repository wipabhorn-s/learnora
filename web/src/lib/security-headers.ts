/**
 * Security header ของทุกหน้าเว็บ (next.config.ts ใส่ให้ทุก route)
 *
 * CSP บอกเบราว์เซอร์ว่าโหลดอะไรจากที่ไหนได้บ้าง ถ้ามีคนแทรกสคริปต์เข้ามาได้ (XSS)
 * สคริปต์นั้นจะส่งข้อมูลออกไปโดเมนอื่น หรือโหลดสคริปต์จากที่อื่นมาเพิ่มไม่ได้
 * โดเมนภายนอกที่ใช้จริงมีแค่:
 * - Opn (Omise.js โทเค็นบัตร, รูป QR พร้อมเพย์)
 * - Google Identity Services (ปุ่มเชื่อมบัญชี Google ในหน้า Login & security)
 * - Cloudinary (รูปและวิดีโอ), Unsplash (รูปตัวอย่าง)
 * เพิ่มบริการภายนอกใหม่ ต้องเพิ่มโดเมนที่นี่ด้วย ไม่งั้นเบราว์เซอร์จะบล็อก
 *
 * script-src ยังต้องมี 'unsafe-inline' เพราะ Next ใส่สคริปต์ inline ตอน hydrate
 * (ใช้ nonce แทนได้ แต่ต้อง render ทุกหน้าแบบ dynamic) ข้อจำกัดเรื่องโดเมนยังได้ผลเต็ม
 */
export function contentSecurityPolicy(isDev: boolean): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      // React Refresh ตอน dev ต้องใช้ eval
      ...(isDev ? ["'unsafe-eval'"] : []),
      "https://cdn.omise.co",
      "https://accounts.google.com/gsi/client",
    ],
    "style-src": [
      "'self'",
      "'unsafe-inline'",
      "https://accounts.google.com/gsi/style",
    ],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://res.cloudinary.com",
      "https://images.unsplash.com",
      "https://*.omise.co",
      // รูป QR พร้อมเพย์: ลิงก์ของ Opn (api.omise.co) redirect ไปไฟล์บน S3 ของ Opn
      // CSP เช็กปลายทางหลัง redirect ด้วย ไม่ใส่โดเมนนี้รูป QR จะไม่ขึ้น
      "https://omise-gateway-production.s3.ap-southeast-1.amazonaws.com",
    ],
    "media-src": ["'self'", "blob:", "https://res.cloudinary.com"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://*.omise.co",
      "https://accounts.google.com/gsi/",
      // hot reload ตอน dev
      ...(isDev ? ["ws:", "wss:"] : []),
    ],
    "frame-src": ["https://accounts.google.com/gsi/", "https://*.omise.co"],
    // ห้ามเว็บอื่นเอาหน้าเราไปใส่ iframe (กัน clickjacking)
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
  };

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

export function securityHeaders(isDev: boolean) {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(isDev) },
    // เบราว์เซอร์รุ่นเก่าที่ไม่รู้จัก frame-ancestors
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    },
    // บังคับ HTTPS (ตอน dev เป็น http จึงไม่ใส่ ไม่งั้นเบราว์เซอร์จำแล้วเปิด localhost ไม่ได้)
    ...(isDev
      ? []
      : [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ]),
  ];
}
