"use server";

import { AdminApi, CreateAdminInput } from "@/lib/api/admin.api";
import { ApiError } from "@/lib/api/api-error";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateUserStatusAction(userId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  try {
    await AdminApi.updateUserStatus(userId, session.user.access_token);
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/admin/users?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath("/admin/users");
}

export async function updateCourseStatusAction(courseId: number) {
  const session = await auth();
  if (!session) redirect("/login");

  try {
    await AdminApi.updateCourseStatus(courseId, session.user.access_token);
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/admin/courses?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath("/admin/courses");
}

export async function refundPurchaseAction(purchaseId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  try {
    await AdminApi.refundPurchase(purchaseId, session.user.access_token);
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/admin/payments?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath("/admin/payments");
}

export async function updateAdminStatusAction(adminId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  try {
    await AdminApi.updateAdminStatus(adminId, session.user.access_token);
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/admin/admins?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath("/admin/admins");
}

export async function createAdminAction(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const data: CreateAdminInput = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  try {
    await AdminApi.createAdmin(data, session.user.access_token);
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/admin/admins?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath("/admin/admins");
  redirect("/admin/admins");
}
