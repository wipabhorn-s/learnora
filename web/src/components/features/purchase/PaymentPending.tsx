"use client";

import { TEXT_LINK_CLASS } from "@/components/shared/TextLink";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { pollPaymentProgressAction } from "@/lib/actions/purchase.action";
import type { PaymentProgress } from "@/lib/api/purchase.api";
import { cn } from "@/lib/utils";
import { Download, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/** ถามสถานะทุก 4 วินาที เร็วพอให้รู้สึกทันใจ ไม่ถี่จนเปลือง API ของ Opn */
const POLL_MS = 4000;

function useSecondsLeft(expiresAt: string | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (!expiresAt) return null;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
}

/**
 * เปลี่ยนช่องทาง = ยกเลิกรายการนี้ แต่ QR พร้อมเพย์สั่งยกเลิกที่ Opn ไม่ได้
 * จึงเตือนก่อนว่าอย่าสแกน QR เดิมอีก (ถ้าเผลอจ่าย ระบบจะจัดการให้ แต่ยุ่งยากกว่า)
 */
function ChangeMethodButton({ hasQr }: { hasQr: boolean }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button type="button" className={cn(TEXT_LINK_CLASS, "text-sm")} />
        }
      >
        Choose another payment method
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this payment?</DialogTitle>
          <DialogDescription>
            {hasQr
              ? "This QR code will be cancelled once you pay another way. Please don't scan it after that."
              : "This payment will be cancelled once you pay another way."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Keep this payment
          </DialogClose>
          <Button
            nativeButton={false}
            render={<Link href="/checkout?new=1">Choose another method</Link>}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PaymentPending({
  initial,
}: {
  initial: PaymentProgress;
}) {
  const [progress, setProgress] = useState(initial);
  const secondsLeft = useSecondsLeft(progress.expiresAt);

  // จ่ายเสร็จ/ไม่ผ่านเมื่อไหร่ action จะ redirect ไปหน้าผลลัพธ์เอง
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        setProgress(await pollPaymentProgressAction(initial.purchaseId));
      } catch {
        // เน็ตสะดุดชั่วคราวไม่เป็นไร รอบถัดไปถามใหม่
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [initial.purchaseId]);

  const countdown =
    secondsLeft === null
      ? null
      : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <div className="flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md items-center gap-5 p-8 text-center">
        {progress.qrCodeUrl ? (
          <>
            <div>
              <h1 className="text-2xl font-extrabold">Scan to pay</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Open any Thai banking app and scan this PromptPay QR code.
              </p>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element -- รูป QR จากโดเมนของ Opn ไม่ผ่าน next/image */}
            <img
              src={progress.qrCodeUrl}
              alt="PromptPay QR code"
              className="size-64 rounded-xl border bg-white p-2"
            />

            {countdown && (
              <p className="text-sm text-muted-foreground">
                {secondsLeft === 0 ? (
                  "This QR code has expired."
                ) : (
                  <>
                    Expires in{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {countdown}
                    </span>
                  </>
                )}
              </p>
            )}

            <Button
              nativeButton={false}
              variant="outline"
              size="lg"
              className="w-full"
              render={
                <a href={progress.qrCodeUrl} download="learnora-promptpay.png">
                  <Download />
                  Save QR code
                </a>
              }
            />
          </>
        ) : (
          <>
            <Loader2 className="size-12 animate-spin text-primary" />
            <div>
              <h1 className="text-2xl font-extrabold">
                Waiting for confirmation
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We&apos;re checking your payment with your bank. This page
                updates automatically.
              </p>
            </div>

            {/* ผู้ใช้กดย้อนกลับมาก่อนยืนยันที่ธนาคาร ให้กลับไปทำต่อได้ */}
            {progress.authorizeUri && (
              <Button
                nativeButton={false}
                size="lg"
                className="w-full"
                render={<a href={progress.authorizeUri}>Continue payment</a>}
              />
            )}
          </>
        )}

        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Your courses unlock as soon as the payment arrives.
        </p>

        <ChangeMethodButton hasQr={Boolean(progress.qrCodeUrl)} />
      </Card>
    </div>
  );
}
