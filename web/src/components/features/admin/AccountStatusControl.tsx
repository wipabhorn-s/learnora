"use client";

import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  updateAdminStatusAction,
  updateUserStatusAction,
} from "@/lib/actions/admin.action";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function AccountStatusControl({
  accountId,
  accountName,
  active,
  kind,
}: {
  accountId: string;
  accountName: string;
  active: boolean;
  kind: "user" | "admin";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const confirmChange = () => {
    startTransition(async () => {
      if (kind === "admin") {
        await updateAdminStatusAction(accountId);
      } else {
        await updateUserStatusAction(accountId);
      }

      setOpen(false);
      router.refresh();
    });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      pending={isPending}
      trigger={
        <Button
          type="button"
          variant={active ? "destructive" : "outline"}
          size="sm"
          className="w-24 font-semibold"
          onClick={() => setOpen(true)}
          disabled={isPending}
        >
          {active ? "Suspend" : "Reactivate"}
        </Button>
      }
      title={active ? "Suspend this account?" : "Reactivate this account?"}
      description={
        active
          ? `${accountName} will not be able to sign in until the account is reactivated.`
          : `${accountName} will be able to sign in and use the platform again.`
      }
      confirmLabel={active ? "Suspend Account" : "Reactivate Account"}
      destructive={active}
      onConfirm={confirmChange}
    />
  );
}
