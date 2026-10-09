import { ApiError } from "@/lib/api/api-error";
import {
  accessTokenExpiry,
  needsRefresh,
  refreshSession,
} from "@/lib/session-token";
import type { JWT } from "next-auth/jwt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("@/lib/api/auth.api", () => ({ AuthApi: { refresh } }));

/** JWT ปลอมของ API: สนใจแค่ exp (วินาที) */
const fakeAccessToken = (expSeconds: number) =>
  `h.${Buffer.from(JSON.stringify({ exp: expSeconds })).toString("base64url")}.s`;

const NOW = new Date("2026-10-06T00:00:00Z").getTime();

const baseToken = (overrides: Partial<JWT> = {}): JWT => ({
  sub: "user-1",
  firstName: "Ann",
  lastName: "Lee",
  email: "ann@test.local",
  role: "STUDENT",
  isInstructor: false,
  avatarUrl: null,
  access_token: fakeAccessToken(NOW / 1000 + 600),
  refresh_token: "refresh-1",
  ...overrides,
});

describe("accessTokenExpiry", () => {
  it("reads exp from the API's JWT (ms)", () => {
    expect(accessTokenExpiry(fakeAccessToken(1_800_000_000))).toBe(
      1_800_000_000_000,
    );
  });

  it("treats a malformed token as already expired", () => {
    expect(accessTokenExpiry("not-a-jwt")).toBe(0);
  });
});

describe("needsRefresh", () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW }));
  afterEach(() => vi.useRealTimers());

  it("waits while the access token has more than a minute left", () => {
    expect(needsRefresh(baseToken())).toBe(false);
  });

  it("refreshes within the last minute or after expiry", () => {
    const soon = fakeAccessToken(NOW / 1000 + 30);
    expect(needsRefresh(baseToken({ access_token: soon }))).toBe(true);
    const past = fakeAccessToken(NOW / 1000 - 10);
    expect(needsRefresh(baseToken({ access_token: past }))).toBe(true);
  });

  it("never refreshes a session without a refresh token (logged in before this feature)", () => {
    const past = fakeAccessToken(NOW / 1000 - 10);
    expect(
      needsRefresh(baseToken({ access_token: past, refresh_token: undefined })),
    ).toBe(false);
  });
});

describe("refreshSession", () => {
  beforeEach(() => {
    refresh.mockReset();
  });

  it("stores the new tokens, expiry and latest user details", async () => {
    const access = fakeAccessToken(NOW / 1000 + 900);
    refresh.mockResolvedValue({
      access_token: access,
      refresh_token: "refresh-2",
      user: {
        id: "user-1",
        firstName: "Ann",
        lastName: "Lee",
        email: "ann@test.local",
        role: "STUDENT",
        isInstructor: true,
        avatarUrl: null,
      },
    });

    const token = await refreshSession(baseToken(), "203.0.113.7");

    // ส่ง IP ของผู้ใช้ต่อให้ API นับ rate limit ต่อคน
    expect(refresh).toHaveBeenCalledWith("refresh-1", "203.0.113.7");
    expect(token).toMatchObject({
      access_token: access,
      refresh_token: "refresh-2",
      accessTokenExpires: (NOW / 1000 + 900) * 1000,
      isInstructor: true,
    });
  });

  it("returns null when the API rejects the refresh token (log in again)", async () => {
    refresh.mockImplementation(() =>
      Promise.reject(
        new ApiError(401, "Your session has expired", "REFRESH_INVALID"),
      ),
    );
    expect(await refreshSession(baseToken())).toBeNull();
  });

  it("keeps the session when the API is unreachable", async () => {
    refresh.mockImplementation(() =>
      Promise.reject(new TypeError("fetch failed")),
    );
    const token = baseToken();
    expect(await refreshSession(token)).toBe(token);
  });
});
