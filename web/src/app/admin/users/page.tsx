import AccountStatusControl from "@/components/features/admin/AccountStatusControl";
import AdminFilters from "@/components/features/admin/AdminFilters";
import AdminTable, {
  PrimaryCell,
} from "@/components/features/admin/AdminTable";
import { Page, PageHeader } from "@/components/shared/Page";
import StatusBadge from "@/components/shared/StatusBadge";
import ToastFromUrl from "@/components/shared/ToastFromUrl";
import { AdminApi, fetchAllPages } from "@/lib/api/admin.api";
import { auth } from "@/lib/auth";
import { formatDate, fullName } from "@/lib/format";
import { Users } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Users | Learnora Admin" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; isInstructor?: string }>;
}) {
  const { search, isInstructor } = await searchParams;
  const session = await auth();
  const users = await fetchAllPages((page) =>
    AdminApi.findUsers(session!.user.access_token, {
      search,
      isInstructor,
      page,
      limit: 50,
    }),
  );

  return (
    <Page height="fit">
      <PageHeader
        title="Users"
        description="Manage student and instructor accounts."
      />
      <ToastFromUrl params={["error"]} />

      <AdminFilters
        searchPlaceholder="Search by name or email..."
        filterGroups={[
          {
            key: "isInstructor",
            label: "Role",
            options: [
              { value: "false", label: "Student" },
              { value: "true", label: "Instructor" },
            ],
          },
        ]}
      />

      <AdminTable
        columns={[
          { label: "User" },
          { label: "Role", align: "center" },
          { label: "Status", align: "center" },
          { label: "Joined" },
          { label: "Action", align: "center" },
        ]}
        template="minmax(16rem,1.6fr) 8rem 8rem 10rem 7rem"
        rows={users}
        getKey={(user) => user.id}
        renderRow={(user) => {
          const name = fullName(user);
          return [
            <PrimaryCell key="user" title={name} subtitle={user.email} />,
            // ผู้สอนก็มี role STUDENT สิทธิ์สอนดูจาก isInstructor
            <StatusBadge key="role">
              {user.isInstructor ? "Instructor" : "Student"}
            </StatusBadge>,
            <StatusBadge key="status" tone={user.status ? "success" : "danger"}>
              {user.status ? "Active" : "Suspended"}
            </StatusBadge>,
            <span key="joined" className="text-muted-foreground">
              {formatDate(user.createdAt)}
            </span>,
            <AccountStatusControl
              key="action"
              accountId={user.id}
              accountName={name}
              active={user.status}
              kind="user"
            />,
          ];
        }}
        empty={{
          icon: Users,
          title: "No users found",
          description: "Try changing the search or role filter.",
        }}
      />
    </Page>
  );
}
