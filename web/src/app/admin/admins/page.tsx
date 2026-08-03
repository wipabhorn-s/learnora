import AccountStatusControl from "@/components/features/admin/AccountStatusControl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createAdminAction } from "@/lib/actions/admin.action";
import { AdminApi } from "@/lib/api/admin.api";
import { auth } from "@/lib/auth";
import { Plus, Shield } from "lucide-react";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Manage Admins | Learnora Admin" };

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ManageAdminsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (session!.user.role !== "SUPER_ADMIN") redirect("/admin/dashboard");

  const admins = await AdminApi.findAdmins(session!.user.access_token);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Manage Admins
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage admin accounts.
            <span className="mx-2 text-border">|</span>
            <span className="font-semibold text-foreground">
              {admins.length}
            </span>{" "}
            {admins.length === 1 ? "admin" : "admins"}
          </p>
        </div>

        <Dialog>
          <DialogTrigger render={<Button type="button" size="lg" />}>
            <Plus />
            Create Admin
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Admin Account</DialogTitle>
              <DialogDescription>
                Add a new administrator who can manage the Learnora platform.
              </DialogDescription>
            </DialogHeader>

            <form action={createAdminAction}>
              <FieldGroup className="gap-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field className="gap-1">
                    <FieldLabel htmlFor="firstName">First name</FieldLabel>
                    <Input
                      id="firstName"
                      name="firstName"
                      placeholder="Nattapong"
                      required
                    />
                  </Field>
                  <Field className="gap-1">
                    <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                    <Input
                      id="lastName"
                      name="lastName"
                      placeholder="Srisuk"
                      required
                    />
                  </Field>
                </div>
                <Field className="gap-1">
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@learnora.com"
                    required
                  />
                </Field>
                <Field className="gap-1">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                  />
                </Field>
                <DialogFooter className="mt-2">
                  <Button type="submit">Create Admin</Button>
                </DialogFooter>
              </FieldGroup>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {params.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error}
        </div>
      )}

      <Card className="gap-0 overflow-hidden p-0">
        {admins.length > 0 ? (
          <div className="max-h-[calc(100dvh-16rem)] overflow-auto">
            <div className="min-w-[900px]">
              <div className="sticky top-0 z-10 grid grid-cols-[minmax(16rem,1.6fr)_9rem_9rem_10rem_7rem] items-center gap-4 border-b bg-muted/90 px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground backdrop-blur">
                <span>Admin</span>
                <span className="text-center">Role</span>
                <span className="text-center">Status</span>
                <span>Joined</span>
                <span className="text-center">Action</span>
              </div>

              <div className="divide-y">
                {admins.map((admin) => {
                  const accountName = `${admin.firstName} ${admin.lastName}`;

                  return (
                    <div
                      key={admin.id}
                      className="grid min-h-18 grid-cols-[minmax(16rem,1.6fr)_9rem_9rem_10rem_7rem] items-center gap-4 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {accountName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {admin.email}
                        </p>
                      </div>

                      <span className="inline-flex h-7 w-28 items-center justify-center justify-self-center rounded-full border border-border text-xs font-semibold text-muted-foreground">
                        {admin.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                      </span>

                      <span
                        className={`inline-flex h-7 w-28 items-center justify-center justify-self-center rounded-full border text-xs font-semibold ${
                          admin.status
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {admin.status ? "Active" : "Suspended"}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {formatDate(admin.createdAt)}
                      </span>

                      <div className="flex justify-center">
                        <AccountStatusControl
                          accountId={admin.id}
                          accountName={accountName}
                          active={admin.status}
                          kind="admin"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-secondary">
              <Shield size={38} className="text-primary/70" />
            </div>
            <p className="text-lg font-bold">No admin accounts yet</p>
            <p className="text-sm text-muted-foreground">
              Use Create Admin to add the first administrator.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
