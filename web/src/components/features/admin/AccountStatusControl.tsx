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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) setOpen(nextOpen);
      }}
    >
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

      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>
            {active ? "Suspend this account?" : "Reactivate this account?"}
          </DialogTitle>
          <DialogDescription>
            {active
              ? `${accountName} will not be able to sign in until the account is reactivated.`
              : `${accountName} will be able to sign in and use the platform again.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={active ? "destructive" : "default"}
            onClick={confirmChange}
            disabled={isPending}
          >
            {isPending
              ? "Saving..."
              : active
                ? "Suspend Account"
                : "Reactivate Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
