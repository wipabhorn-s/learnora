/** ข้อความที่ผู้ใช้เห็นเมื่อล็อกอินไม่ผ่าน แยกตามสาเหตุจริงที่ API ส่งมา */
export const LOGIN_ERRORS: Record<string, string> = {
  INVALID_CREDENTIALS: "Email or password is invalid",
  GOOGLE_ONLY_ACCOUNT:
    "This account was created with Google. Use Continue with Google, or set a password via Forgot password.",
  ACCOUNT_SUSPENDED: "Your account has been suspended. Please contact support.",
  EMAIL_NOT_VERIFIED:
    "Please verify your email first. Check your inbox for the verification link.",
  SERVICE_UNAVAILABLE:
    "We could not reach the server. Please try again in a moment.",
  // ไม่ใช่ error จริง: รหัสผ่านถูกแล้ว แต่บัญชีเปิด 2FA ไว้
  CODE_REQUIRED: "We sent a 6-digit code to your email.",
  OTP_INVALID: "Incorrect code. Please try again.",
  OTP_EXPIRED: "This code has expired. Request a new one.",
  OTP_LOCKED: "Too many incorrect attempts. Request a new code.",
  OTP_SESSION_EXPIRED: "Your login session has expired. Please log in again.",
  TOO_MANY_REQUESTS:
    "Too many requests from your network. Please wait a minute and try again.",
  TOO_MANY_ATTEMPTS:
    "Too many failed attempts. Please wait a few minutes, or reset your password.",
};

export function loginErrorMessage(code: string): string {
  // "OTP_INVALID:3" = รหัสผิด เหลืออีก 3 ครั้ง (ดู toLoginError ใน lib/auth.ts)
  const [base, remaining] = code.split(":");
  if (base === "OTP_INVALID" && remaining) {
    return `Incorrect code. ${remaining} ${remaining === "1" ? "attempt" : "attempts"} left.`;
  }
  // "TOO_MANY_ATTEMPTS:12" = ล็อกอยู่ ต้องรออีก 12 นาที
  if (base === "TOO_MANY_ATTEMPTS" && remaining) {
    return `Too many failed attempts. Try again in ${remaining} ${remaining === "1" ? "minute" : "minutes"}, or reset your password.`;
  }
  return LOGIN_ERRORS[base] ?? LOGIN_ERRORS.INVALID_CREDENTIALS;
}
