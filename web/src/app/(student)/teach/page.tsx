import BecomeInstructorButton from "@/components/features/teach/BecomeInstructorButton";
import EmptyState from "@/components/shared/EmptyState";
import { Page, PageHeader } from "@/components/shared/Page";
import { auth } from "@/lib/auth";
import { WORKSPACE_HOME } from "@/lib/constants/workspace";
import { Presentation } from "lucide-react";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Start Teaching | Learnora" };

/** หน้าตาเดียวกับหน้าว่างอื่น ๆ: ไอคอน หัวข้อ คำอธิบาย แล้วปุ่มเดียว */
export default async function TeachPage() {
  const session = await auth();
  if (session?.user.isInstructor) redirect(WORKSPACE_HOME.teach);

  return (
    <Page height="fill">
      <PageHeader title="Start Teaching" />

      <EmptyState
        icon={Presentation}
        title="Teach on Learnora"
        description="Share what you know with learners. It's the same account — you can switch between learning and teaching anytime."
        className="min-h-128"
      >
        <BecomeInstructorButton />
      </EmptyState>
    </Page>
  );
}
