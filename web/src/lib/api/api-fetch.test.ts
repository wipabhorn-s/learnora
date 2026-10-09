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

describe("apiFetch forwards the visitor's IP to the API", () => {
  const sentHeaders = async (secret: string | undefined) => {
    vi.resetModules();
    vi.doMock("@/lib/env", () => ({
      env: { API_URL: "http://api.test", INTERNAL_API_SECRET: secret },
    }));
    const fetchMock = vi.fn(() => Promise.resolve(new Response("{}")));
    vi.stubGlobal("fetch", fetchMock);
    const { apiFetch } = await import("@/lib/api/api-fetch");

    await apiFetch("/courses", { clientIp: "203.0.113.7" });

    vi.unstubAllGlobals();
    const init = (fetchMock.mock.calls[0] as unknown[])[1] as RequestInit;
    return new Headers(init.headers);
  };

  it("production: sends X-Client-IP with the shared secret", async () => {
    const headers = await sentHeaders("s".repeat(40));
    expect(headers.get("x-client-ip")).toBe("203.0.113.7");
    expect(headers.get("x-internal-secret")).toBe("s".repeat(40));
    expect(headers.get("x-forwarded-for")).toBeNull();
  });

  it("dev (no secret): sends X-Forwarded-For only", async () => {
    const headers = await sentHeaders(undefined);
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.7");
    expect(headers.get("x-internal-secret")).toBeNull();
  });
});
