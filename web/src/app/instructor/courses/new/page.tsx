import CourseDetailsForm from "@/components/features/course/CourseDetailsForm";
import CoursePageHeader from "@/components/features/course/CoursePageHeader";
import { Card } from "@/components/ui/card";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Create Course | Learnora" };

/** ขั้นที่ 1 จาก 2: กรอกข้อมูลคอร์สหน้าเดียว แล้วไปเพิ่มบทเรียนในหน้า builder */
export default function CreateCoursePage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <CoursePageHeader
        title="Create a course"
        subtitle="Fill in the details, then add lessons on the next page."
      />
      <Card className="p-6 sm:p-8">
        <CourseDetailsForm />
      </Card>
    </div>
  );
}
