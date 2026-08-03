"use server";

import { ApiError } from "@/lib/api/api-error";
import { WishlistApi } from "@/lib/api/wishlist.api";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function addToWishlistAction(
  courseId: number,
  redirectTo: string,
) {
  const session = await auth();
  if (!session) redirect("/login");

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
  redirectTo: string,
) {
  const session = await auth();
  if (!session) redirect("/login");

  await WishlistApi.remove(courseId, session.user.access_token);

  revalidatePath(redirectTo);
  revalidatePath("/wishlist");
  revalidatePath("/", "layout");
}
