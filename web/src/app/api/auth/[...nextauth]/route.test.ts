// @vitest-environment node
import { GET } from "@/app/api/auth/[...nextauth]/route";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const { nextAuthGet } = vi.hoisted(() => ({ nextAuthGet: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  handlers: { GET: nextAuthGet, POST: vi.fn() },
}));

const request = (path: string) =>
  new NextRequest(`http://localhost:3000/api/auth/${path}`);

describe("GET /api/auth/session", () => {
  it("never sends the API access token to the browser", async () => {
    nextAuthGet.mockResolvedValue(
      Response.json(
        {
          user: { id: "user-1", firstName: "Ann", access_token: "secret-jwt" },
          expires: "2026-11-01T00:00:00.000Z",
        },
        { headers: { "set-cookie": "authjs.session-token=abc; Path=/" } },
      ),
    );

    const response = await GET(request("session"));
    const body = (await response.json()) as { user: Record<string, unknown> };

    expect(body.user).toEqual({ id: "user-1", firstName: "Ann" });
    expect(JSON.stringify(body)).not.toContain("secret-jwt");
    // คุกกี้ที่ NextAuth ต่ออายุให้ยังส่งต่อไปครบ
    expect(response.headers.get("set-cookie")).toContain(
      "authjs.session-token",
    );
  });

  it("passes other NextAuth routes through untouched", async () => {
    const original = new Response("providers");
    nextAuthGet.mockResolvedValue(original);

    expect(await GET(request("providers"))).toBe(original);
  });
});
