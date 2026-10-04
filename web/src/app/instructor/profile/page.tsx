import { redirect } from "next/navigation";

/** เหลือหน้า Profile หน้าเดียวที่ /profile แล้ว เก็บไว้ให้ลิงก์เก่ายังใช้ได้ */
export default function InstructorProfilePage() {
  redirect("/profile");
}
