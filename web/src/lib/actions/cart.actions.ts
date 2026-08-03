"use server";

import { ApiError } from "@/lib/api/api-error";
import { CartApi } from "@/lib/api/cart.api";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function addToCartAction(courseId: number, redirectTo: string) {
  const session = await auth();
  if (!session) redirect("/login");

  try {
    await CartApi.add(courseId, session.user.access_token);
  } catch (error) {
    if (error instanceof ApiError) {
      const separator = redirectTo.includes("?") ? "&" : "?";
      redirect(
        `${redirectTo}${separator}cartError=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }

  revalidatePath(redirectTo);
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function renewAccessAction(courseId: number) {
  const session = await auth();
  if (!session) redirect("/login");

  try {
    await CartApi.add(courseId, session.user.access_token);
  } catch (error) {
    if (error instanceof ApiError) {
      // อยู่ในตะกร้าแล้วก็ถือว่าบรรลุเป้าหมายของ renew แล้ว ไม่ต้องเตือน พาไปตะกร้าตรงๆ
      if (error.message === "This course is already in your cart") {
        redirect("/cart");
      }
      redirect(`/my-courses?cartError=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath("/cart");
  revalidatePath("/", "layout");
  redirect("/cart");
}

export async function removeFromCartAction(
  courseId: number,
  revalidateTo = "/cart",
) {
  const session = await auth();
  if (!session) redirect("/login");

  await CartApi.remove(courseId, session.user.access_token);

  revalidatePath(revalidateTo);
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}
