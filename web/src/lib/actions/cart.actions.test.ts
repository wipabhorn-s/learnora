import { addToCartAction } from "@/lib/actions/cart.actions";
import { addToWishlistAction } from "@/lib/actions/wishlist.action";
import { ApiError } from "@/lib/api/api-error";
import { CartApi } from "@/lib/api/cart.api";
import { WishlistApi } from "@/lib/api/wishlist.api";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { access_token: "token" } })),
}));
vi.mock("@/lib/api/cart.api", () => ({ CartApi: { add: vi.fn() } }));
vi.mock("@/lib/api/wishlist.api", () => ({ WishlistApi: { add: vi.fn() } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// redirect() ของจริง throw เพื่อหยุดการทำงาน ทำแบบเดียวกัน
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));

describe("cart / wishlist actions: return path from the browser", () => {
  beforeEach(() => {
    vi.mocked(redirect).mockClear();
    vi.mocked(CartApi.add).mockRejectedValue(
      new ApiError(409, "Already in cart"),
    );
    vi.mocked(WishlistApi.add).mockRejectedValue(
      new ApiError(409, "Already saved"),
    );
  });

  it("returns to the page the user was on", async () => {
    await expect(addToCartAction(1, "/courses?page=2")).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith(
      "/courses?page=2&cartError=Already%20in%20cart",
    );
  });

  it.each(["https://evil.com", "//evil.com", "/\\evil.com"])(
    "never sends the user to another site (%s)",
    async (returnTo) => {
      await expect(addToCartAction(1, returnTo)).rejects.toThrow();
      expect(redirect).toHaveBeenCalledWith(
        "/courses?cartError=Already%20in%20cart",
      );

      await expect(addToWishlistAction(1, returnTo)).rejects.toThrow();
      expect(redirect).toHaveBeenCalledWith(
        "/courses?wishlistError=Already%20saved",
      );
    },
  );
});
