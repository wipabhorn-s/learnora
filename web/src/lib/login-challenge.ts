import { cookies } from "next/headers";

/**
 * ระหว่างล็อกอินแบบ 2 ขั้นตอน: รหัสผ่านถูกแล้ว รอใส่รหัส 6 หลักจากอีเมล
 * challengeId ที่ API ให้มาฝากไว้ในคุกกี้ httpOnly อายุเท่ารหัส (10 นาที)
 * โค้ดฝั่ง browser อ่านไม่ได้ และไม่ต้องส่งไปมาผ่านหน้าเว็บ
 */
const LOGIN_CHALLENGE_COOKIE = "learnora.login_challenge";
const MAX_AGE_SECONDS = 60 * 10;

export async function setLoginChallenge(challengeId: string) {
  (await cookies()).set(LOGIN_CHALLENGE_COOKIE, challengeId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function getLoginChallenge(): Promise<string | null> {
  return (await cookies()).get(LOGIN_CHALLENGE_COOKIE)?.value ?? null;
}

export async function clearLoginChallenge() {
  (await cookies()).delete(LOGIN_CHALLENGE_COOKIE);
}
