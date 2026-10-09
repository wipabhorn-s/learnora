"use server";

import { ApiError } from "@/lib/api/api-error";
import { WishlistApi } from "@/lib/api/wishlist.api";
import { auth } from "@/lib/auth";
import { safeLocalPath } from "@/lib/safe-path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function addToWishlistAction(
  courseId: number,
  returnTo: string,
) {
  const session = await auth();
  if (!session) redirect("/login");

  // path มาจาก browser ห้ามพาไปเว็บอื่น
  const redirectTo = safeLocalPath(returnTo, "/courses");

  try {
    await WishlistApi.add(courseId, session.user.access_token);
  } catch (error) {
    if (error instanceof ApiError) {
      const separator = redirectTo.includes("?") ? "&" : "?";
      redirect(
        `${redirectTo}${separator}wishlistError=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }

  revalidatePath(redirectTo);
  revalidatePath("/wishlist");
  revalidatePath("/", "layout");
}

export async function removeFromWishlistAction(
  courseId: number,
  returnTo: string,
) {
  const session = await auth();
  if (!session) redirect("/login");

  await WishlistApi.remove(courseId, session.user.access_token);

  revalidatePath(safeLocalPath(returnTo, "/wishlist"));
  revalidatePath("/wishlist");
  revalidatePath("/", "layout");
}
