"use server";

import { ApiError } from "@/lib/api/api-error";
import { PurchaseApi } from "@/lib/api/purchase.api";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function checkoutAction(paymentMethodId?: string) {
  const session = await auth();
  if (!session) redirect("/login");

  let purchase;
  try {
    purchase = await PurchaseApi.checkout(
      { paymentMethodId },
      session.user.access_token,
    );
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/payment-failed?message=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  redirect(`/payment-success?purchaseId=${purchase.id}`);
}
