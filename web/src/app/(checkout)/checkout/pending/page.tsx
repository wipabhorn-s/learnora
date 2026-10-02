import PaymentPending from "@/components/features/purchase/PaymentPending";
import { getPaymentProgressAction } from "@/lib/actions/purchase.action";
import { auth } from "@/lib/auth";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Complete your payment | Learnora" };

/**
 * หน้ารอผลการจ่ายเงิน ใช้ 2 กรณี
 * - พร้อมเพย์: แสดง QR ให้สแกน
 * - กลับมาจากธนาคาร/TrueMoney/3-D Secure (return_uri ของ Opn ชี้มาที่นี่)
 * จ่ายเสร็จหรือไม่ผ่าน getPaymentProgressAction จะพาไปหน้าผลลัพธ์เอง
 */
export default async function PaymentPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ purchaseId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { purchaseId } = await searchParams;
  if (!purchaseId) redirect("/cart");

  const progress = await getPaymentProgressAction(purchaseId);

  return <PaymentPending initial={progress} />;
}
