import AdminFilters from "@/components/features/admin/AdminFilters";
import AdminTable, {
  PrimaryCell,
} from "@/components/features/admin/AdminTable";
import { Page, PageHeader } from "@/components/shared/Page";
import StatusBadge, {
  COURSE_STATUS_TONE,
} from "@/components/shared/StatusBadge";
import ToastFromUrl from "@/components/shared/ToastFromUrl";
import { Button } from "@/components/ui/button";
import { updateCourseStatusAction } from "@/lib/actions/admin.action";
import { AdminApi, fetchAllPages } from "@/lib/api/admin.api";
import { auth } from "@/lib/auth";
import { formatEnum, formatPrice, fullName } from "@/lib/format";
import { BookOpen } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Courses | Learnora Admin" };

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const { search, status } = await searchParams;
  const session = await auth();
  const courses = await fetchAllPages((page) =>
    AdminApi.findCourses(session!.user.access_token, {
      search,
      status,
      page,
      limit: 50,
    }),
  );

  return (
    <Page height="fit">
      <PageHeader
        title="Courses"
        description="Review and moderate every course on the platform."
      />
      <ToastFromUrl params={["error"]} />

      <AdminFilters
        searchPlaceholder="Search by course title..."
        filterGroups={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "DRAFT", label: "Draft" },
              { value: "PUBLISHED", label: "Published" },
              { value: "SUSPENDED", label: "Suspended" },
              { value: "DELETED", label: "Deleted" },
            ],
          },
        ]}
      />

      <AdminTable
        columns={[
          { label: "Course" },
          { label: "Price", align: "right" },
          { label: "Students", align: "center" },
          { label: "Status", align: "center" },
          { label: "Action", align: "center" },
        ]}
        template="minmax(18rem,1.8fr) 8rem 8rem 8rem 7rem"
        rows={courses}
        getKey={(course) => course.id}
        renderRow={(course) => [
          <PrimaryCell
            key="course"
            title={course.title}
            subtitle={fullName(course.instructor)}
          />,
          <span key="price" className="font-semibold">
            {formatPrice(course.price)}
          </span>,
          <span key="students" className="text-muted-foreground">
            {course._count.purchaseItems}
          </span>,
          <StatusBadge key="status" tone={COURSE_STATUS_TONE[course.status]}>
            {formatEnum(course.status)}
          </StatusBadge>,
          (course.status === "PUBLISHED" || course.status === "SUSPENDED") && (
            <form
              key="action"
              action={updateCourseStatusAction.bind(null, course.id)}
            >
              <Button
                type="submit"
                variant={
                  course.status === "PUBLISHED" ? "destructive" : "outline"
                }
                size="sm"
                className="w-24 font-semibold"
              >
                {course.status === "PUBLISHED" ? "Suspend" : "Unsuspend"}
              </Button>
            </form>
          ),
        ]}
        empty={{
          icon: BookOpen,
          title: "No courses found",
          description: "Try changing the search or status filter.",
        }}
      />
    </Page>
  );
}
