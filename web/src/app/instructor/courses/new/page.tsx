import CreateCourseForm from "@/components/features/course/CreateCourseForm";
import { ArrowLeft } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Create Course | Learnora" };

export default function CreateCoursePage() {
  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/instructor/courses"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-extrabold">Create New Course</h1>
      </div>

      <CreateCourseForm />
    </div>
  );
}
