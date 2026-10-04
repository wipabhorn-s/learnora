"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * กล่องยืนยันก่อนทำสิ่งที่ย้อนกลับยาก (ลบ, ระงับบัญชี, คืนเงิน ฯลฯ) ใช้ตัวนี้ทุกที่
 * - trigger: ปุ่มที่เปิดกล่อง (ให้ปุ่มนั้นเรียก onOpenChange(true) เอง)
 * - children: ช่องกรอกเพิ่ม (เช่นเหตุผล) อยู่ระหว่างคำอธิบายกับปุ่ม
 * - ระหว่าง pending ปิดกล่องไม่ได้ (กด Esc / คลิกนอก / ปุ่ม X / Cancel) กันกดซ้ำหรือปิดกลางคัน
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  pending,
  trigger,
  title,
  description,
  children,
  confirmLabel,
  pendingLabel = "Saving...",
  destructive = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  trigger: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  children?: React.ReactNode;
  confirmLabel: React.ReactNode;
  pendingLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen);
      }}
    >
      {trigger}

      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {children}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
