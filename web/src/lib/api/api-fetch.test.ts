import { clientIpFrom } from "@/lib/api/api-fetch";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

describe("clientIpFrom (IP forwarded to the API for rate limiting)", () => {
  it("takes the first address in X-Forwarded-For (the user, not the proxies)", () => {
    expect(
      clientIpFrom(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.2" })),
    ).toBe("203.0.113.7");
  });

  it("falls back to X-Real-IP", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe(
      "198.51.100.4",
    );
  });

  it("sends nothing when the request has no IP headers", () => {
    expect(clientIpFrom(new Headers())).toBeUndefined();
  });
});
