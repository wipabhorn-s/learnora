import AccountStatusControl from "@/components/features/admin/AccountStatusControl";
import AdminFilters from "@/components/features/admin/AdminFilters";
import AdminTable, {
  PrimaryCell,
} from "@/components/features/admin/AdminTable";
import { Page, PageHeader } from "@/components/shared/Page";
import StatusBadge from "@/components/shared/StatusBadge";
import ToastFromUrl from "@/components/shared/ToastFromUrl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { createAdminAction } from "@/lib/actions/admin.action";
import { AdminApi } from "@/lib/api/admin.api";
import { auth } from "@/lib/auth";
import { formatDate, fullName } from "@/lib/format";
import { Plus, Shield } from "lucide-react";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Manage Admins | Learnora Admin" };

export default async function ManageAdminsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const session = await auth();
  if (session!.user.role !== "SUPER_ADMIN") redirect("/admin/dashboard");

  const admins = await AdminApi.findAdmins(session!.user.access_token, {
    search,
  });

  return (
    <Page height="fit">
      <PageHeader
        title="Manage Admins"
        description="Create and manage admin accounts."
      />
      <ToastFromUrl params={["error"]} />

      <AdminFilters
        searchPlaceholder="Search by name or email..."
        actions={
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
                      <FieldLabel required htmlFor="firstName">
                        First name
                      </FieldLabel>
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="Enter first name"
                        required
                      />
                    </Field>
                    <Field className="gap-1">
                      <FieldLabel required htmlFor="lastName">
                        Last name
                      </FieldLabel>
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Enter last name"
                        required
                      />
                    </Field>
                  </div>
                  <Field className="gap-1">
                    <FieldLabel required htmlFor="email">
                      Email
                    </FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter email"
                      required
                    />
                  </Field>
                  <Field className="gap-1">
                    <FieldLabel required htmlFor="password">
                      Password
                    </FieldLabel>
                    <PasswordInput
                      id="password"
                      name="password"
                      placeholder="Create a strong password"
                      minLength={8}
                      maxLength={72}
                      required
                    />
                    <FieldDescription>
                      8-72 characters with lowercase, uppercase, a number and a
                      symbol.
                    </FieldDescription>
                  </Field>
                  <DialogFooter className="mt-2">
                    <Button type="submit">Create Admin</Button>
                  </DialogFooter>
                </FieldGroup>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <AdminTable
        columns={[
          { label: "Admin" },
          { label: "Role", align: "center" },
          { label: "Status", align: "center" },
          { label: "Joined" },
          { label: "Action", align: "center" },
        ]}
        template="minmax(16rem,1.6fr) 9rem 9rem 10rem 7rem"
        rows={admins}
        getKey={(admin) => admin.id}
        renderRow={(admin) => {
          const name = fullName(admin);
          return [
            <PrimaryCell key="admin" title={name} subtitle={admin.email} />,
            <StatusBadge key="role">
              {admin.role === "SUPER_ADMIN" ? "Super admin" : "Admin"}
            </StatusBadge>,
            <StatusBadge
              key="status"
              tone={admin.status ? "success" : "danger"}
            >
              {admin.status ? "Active" : "Suspended"}
            </StatusBadge>,
            <span key="joined" className="text-muted-foreground">
              {formatDate(admin.createdAt)}
            </span>,
            <AccountStatusControl
              key="action"
              accountId={admin.id}
              accountName={name}
              active={admin.status}
              kind="admin"
            />,
          ];
        }}
        empty={{
          icon: Shield,
          title: "No admins found",
          description: "Try a different name or email.",
        }}
      />
    </Page>
  );
}
