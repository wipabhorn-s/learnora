import AccountStatusControl from "@/components/features/admin/AccountStatusControl";
import AdminFilters from "@/components/features/admin/AdminFilters";
import { Card } from "@/components/ui/card";
import { AdminApi, type AdminUser } from "@/lib/api/admin.api";
import { auth } from "@/lib/auth";
import { Users } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Users | Learnora Admin" };

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function findAllUsers(
  token: string,
  filters: { search?: string; role?: string },
) {
  const firstPage = await AdminApi.findUsers(token, {
    ...filters,
    page: 1,
    limit: 50,
  });

  if (firstPage.totalPages <= 1) return firstPage.items;

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      AdminApi.findUsers(token, {
        ...filters,
        page: index + 2,
        limit: 50,
      }),
    ),
  );

  return remainingPages.reduce<AdminUser[]>(
    (items, page) => items.concat(page.items),
    firstPage.items,
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    role?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const users = await findAllUsers(session!.user.access_token, {
    search: params.search,
    role: params.role,
  });

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-7xl flex-col gap-6 xl:h-[calc(100dvh-4rem)] xl:min-h-0 xl:overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-3xl font-extrabold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage student and instructor accounts.
        </p>
      </div>

      {params.error && (
        <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error}
        </div>
      )}

      <div className="flex shrink-0 flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminFilters
          className="min-w-0 flex-1"
          searchPlaceholder="Search by name or email..."
          filterGroups={[
            {
              key: "role",
              label: "Role",
              options: [
                { value: "STUDENT", label: "Student" },
                { value: "INSTRUCTOR", label: "Instructor" },
              ],
            },
          ]}
        />
        <span className="shrink-0 self-start text-sm text-muted-foreground sm:self-auto sm:pr-1">
          <span className="font-semibold text-foreground">{users.length}</span>{" "}
          {users.length === 1 ? "user" : "users"}
        </span>
      </div>

      <Card className="min-h-0 flex-1 gap-0 overflow-hidden p-0">
        {users.length > 0 ? (
          <div className="h-full overflow-auto">
            <div className="min-w-[900px]">
              <div className="sticky top-0 z-10 grid grid-cols-[minmax(16rem,1.6fr)_8rem_8rem_10rem_7rem] items-center gap-4 border-b bg-muted/90 px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground backdrop-blur">
                <span>User</span>
                <span className="text-center">Role</span>
                <span className="text-center">Status</span>
                <span>Joined</span>
                <span className="text-center">Action</span>
              </div>

              <div className="divide-y">
                {users.map((user) => {
                  const accountName = `${user.firstName} ${user.lastName}`;

                  return (
                    <div
                      key={user.id}
                      className="grid min-h-18 grid-cols-[minmax(16rem,1.6fr)_8rem_8rem_10rem_7rem] items-center gap-4 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {accountName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>

                      <span className="inline-flex h-7 w-24 items-center justify-center justify-self-center rounded-full border border-border text-xs font-semibold capitalize text-muted-foreground">
                        {user.role.toLowerCase()}
                      </span>

                      <span
                        className={`inline-flex h-7 w-24 items-center justify-center justify-self-center rounded-full border text-xs font-semibold ${
                          user.status
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {user.status ? "Active" : "Suspended"}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </span>

                      <div className="flex justify-center">
                        <AccountStatusControl
                          accountId={user.id}
                          accountName={accountName}
                          active={user.status}
                          kind="user"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-96 flex-col items-center justify-center gap-3 p-16 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-secondary">
              <Users size={38} className="text-primary/70" />
            </div>
            <p className="text-lg font-bold">No users found</p>
            <p className="text-sm text-muted-foreground">
              Try changing the search or role filter.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
