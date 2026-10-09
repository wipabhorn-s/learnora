import { contentSecurityPolicy, securityHeaders } from "@/lib/security-headers";
import { describe, expect, it } from "vitest";

const directive = (csp: string, name: string) =>
  csp.split("; ").find((part) => part.startsWith(`${name} `)) ?? "";

describe("security headers", () => {
  const csp = contentSecurityPolicy(false);

  it("blocks other sites from framing our pages (clickjacking)", () => {
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(
      securityHeaders(false).find((h) => h.key === "X-Frame-Options")?.value,
    ).toBe("DENY");
  });

  it("allows the services the app really uses", () => {
    expect(directive(csp, "script-src")).toContain("https://cdn.omise.co");
    expect(directive(csp, "script-src")).toContain(
      "https://accounts.google.com/gsi/client",
    );
    expect(directive(csp, "img-src")).toContain("https://res.cloudinary.com");
    // QR พร้อมเพย์ของ Opn redirect ไปไฟล์บน S3
    expect(directive(csp, "img-src")).toContain(
      "https://omise-gateway-production.s3.ap-southeast-1.amazonaws.com",
    );
    expect(directive(csp, "media-src")).toContain("https://res.cloudinary.com");
    expect(directive(csp, "connect-src")).toContain("https://*.omise.co");
  });

  it("keeps eval and websockets out of production", () => {
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toContain("ws:");
    expect(contentSecurityPolicy(true)).toContain("'unsafe-eval'");
  });

  it("forces HTTPS in production only", () => {
    const hsts = (dev: boolean) =>
      securityHeaders(dev).some((h) => h.key === "Strict-Transport-Security");
    expect(hsts(false)).toBe(true);
    expect(hsts(true)).toBe(false);
  });
});
