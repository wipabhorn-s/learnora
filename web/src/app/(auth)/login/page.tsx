import AuthHeader from "@/components/features/auth/AuthHeader";
import LoginForm from "@/components/features/auth/LoginForm";
import LoginHello from "@/components/features/auth/LoginHello";
import TextLink from "@/components/shared/TextLink";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Log In | Learnora" };

/**
 * NextAuth ส่งผู้ใช้กลับมาที่หน้านี้พร้อม ?error= เมื่อล็อกอินด้วย Google ไม่ผ่าน
 * (เช่น API ล่ม, บัญชีโดนระงับ, กดยกเลิกที่หน้า Google) เดิมไม่แสดงอะไรเลย
 * ผู้ใช้เลยเห็นแค่ว่ากดแล้วเด้งกลับมาหน้าเดิม
 */
const OAUTH_ERRORS: Record<string, string> = {
  AccessDenied: "Google sign-in was cancelled. Please try again.",
};
const OAUTH_ERROR_FALLBACK =
  "We couldn't sign you in with Google. Please try again in a moment.";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const oauthError = error
    ? (OAUTH_ERRORS[error] ?? OAUTH_ERROR_FALLBACK)
    : null;

  return (
    <>
      {/* จอเล็กไม่มีฝั่งซ้าย (AuthHero) แสดงแม่มดตัวเล็กเหนือฟอร์มแทน */}
      <LoginHello sizes="160px" className="mx-auto w-40 lg:hidden" />

      <AuthHeader
        // มือถือ: อยู่กึ่งกลางใต้รูปแม่มด  จอใหญ่: ชิดซ้ายตามฟอร์ม
        className="text-center lg:text-left"
        title="Log in to Learnora"
        description={
          <>
            Don&apos;t have an account?{" "}
            <TextLink href="/signup">Sign up free</TextLink>
          </>
        }
      />

      <LoginForm initialError={oauthError} />
    </>
  );
}
