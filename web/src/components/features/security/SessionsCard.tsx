"use client";

import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logoutAllDevicesAction } from "@/lib/actions/security.action";
import { toast } from "@/lib/toast";
import { useState, useTransition } from "react";

/**
 * ออกจากระบบทุกเครื่อง: ใช้ตอนลืม log out เครื่องสาธารณะ หรือสงสัยว่ามีคนแอบเข้าบัญชี
 * ทุกเครื่อง (รวมเครื่องนี้) ต้องล็อกอินใหม่ทันที
 */
export default function SessionsCard() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const confirm = () => {
    startTransition(async () => {
      // สำเร็จแล้ว action พาไปหน้า login เอง ถึงบรรทัดถัดไปแปลว่าพลาด
      const result = await logoutAllDevicesAction();
      if (result) toast.error(result.message);
    });
  };

  return (
    <Card className="gap-4 p-6">
      <div>
        <h2 className="font-bold">Devices</h2>
        <p className="text-sm text-muted-foreground">
          Forgot to log out somewhere, or think someone else is using your
          account? Log out everywhere at once.
        </p>
      </div>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        pending={isPending}
        trigger={
          <Button
            type="button"
            variant="outline"
            className="justify-self-start"
            onClick={() => setOpen(true)}
          >
            Log out of all devices
          </Button>
        }
        title="Log out of all devices?"
        description="You'll be logged out everywhere, including this device, and need to log in again."
        confirmLabel="Log out everywhere"
        pendingLabel="Logging out..."
        destructive
        onConfirm={confirm}
      />
    </Card>
  );
}
