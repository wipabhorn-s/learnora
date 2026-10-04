import { ApiError } from "@/lib/api/api-error";
import { UserResponse } from "@/lib/api/api.type";
import { AuthApi } from "@/lib/api/auth.api";
import { env } from "@/lib/env";
import {
  clearLoginChallenge,
  getLoginChallenge,
  setLoginChallenge,
} from "@/lib/login-challenge";
import { loginSchema } from "@/lib/schemas/auth.schema";
import NextAuth, { CredentialsSignin } from "next-auth";
import { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";

/**
 * NextAuth มองว่าการล็อกอินล้มเหลวเป็นเรื่องเดียวกันหมด แล้วตอบ
 * CredentialsSignin กลับมาเฉย ๆ เดิมโค้ดตรงนี้ครอบ try/catch แล้ว return null
 * ทุกกรณี ทำให้คนที่โดนระงับบัญชีหรือยังไม่ยืนยันอีเมลเห็นแค่ "รหัสผ่านผิด"
 *
 * การ throw ตัวนี้แทนทำให้ code ที่ API ส่งมาเดินทางไปถึง server action ได้
 */
export class LoginError extends CredentialsSignin {
  constructor(readonly code: string) {
    super(code);
  }
}

/** คุกกี้อายุสั้นที่พาเจตนา "สมัครเป็นผู้สอน" ข้ามการ redirect ไป Google */
export const INSTRUCTOR_INTENT_COOKIE = "learnora.signup_as_instructor";

function toApiError(error: unknown): ApiError | null {
  return error instanceof ApiError ? error : null;
}

/** แปลง error จาก API เป็น LoginError ให้ server action แยกข้อความได้ */
function toLoginError(error: unknown, fallback: string): LoginError {
  const apiError = toApiError(error);

  // API ล่มหรือต่อไม่ติด ไม่ใช่ "รหัสผ่านผิด" — ต้องแยกให้ออก
  // ไม่งั้นผู้ใช้จะนั่งพิมพ์รหัสซ้ำทั้งที่ไม่มีอะไรผิดเลย
  if (!apiError) return new LoginError("SERVICE_UNAVAILABLE");

  // LoginError พาไปได้แค่ code จึงฝากจำนวนครั้งที่เหลือไว้ท้าย code
  if (apiError.code === "OTP_INVALID") {
    const remaining = /(\d+) attempt/.exec(apiError.message)?.[1];
    return new LoginError(
      remaining ? `OTP_INVALID:${remaining}` : "OTP_INVALID",
    );
  }
  // ล็อกชั่วคราวเพราะใส่รหัสผ่านผิดหลายครั้ง ฝากจำนวนนาทีที่ต้องรอไว้ท้าย code
  if (apiError.code === "TOO_MANY_ATTEMPTS") {
    const minutes = /in (\d+) minute/.exec(apiError.message)?.[1];
    return new LoginError(
      minutes ? `TOO_MANY_ATTEMPTS:${minutes}` : "TOO_MANY_ATTEMPTS",
    );
  }

  return new LoginError(apiError.code ?? fallback);
}

/** ขั้นที่ 2 ของการล็อกอินเมื่อเปิด 2FA: รหัส 6 หลัก + challengeId ในคุกกี้ */
async function authorizeWithCode(code: string) {
  const challengeId = await getLoginChallenge();
  if (!challengeId) throw new LoginError("OTP_SESSION_EXPIRED");

  try {
    const { access_token, user } = await AuthApi.verifyLoginCode(
      challengeId,
      code,
    );
    await clearLoginChallenge();
    return { ...user, access_token };
  } catch (error) {
    throw toLoginError(error, "OTP_INVALID");
  }
}

function fillToken(token: JWT, user: UserResponse, accessToken: string): JWT {
  token.sub = user.id;
  token.firstName = user.firstName;
  token.lastName = user.lastName;
  token.email = user.email;
  token.role = user.role;
  token.isInstructor = user.isInstructor;
  token.avatarUrl = user.avatarUrl;
  token.access_token = accessToken;
  return token;
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  session: { strategy: "jwt", maxAge: 86370 },
  pages: { signIn: "/login", error: "/login" },

  providers: [
    Credentials({
      async authorize(input) {
        if (typeof input?.code === "string") {
          return authorizeWithCode(input.code);
        }

        const parsed = loginSchema.safeParse(input);

        if (!parsed.success) {
          throw new LoginError("INVALID_CREDENTIALS");
        }

        let result: Awaited<ReturnType<typeof AuthApi.login>>;
        try {
          result = await AuthApi.login(parsed.data);
        } catch (error) {
          throw toLoginError(error, "INVALID_CREDENTIALS");
        }

        // เปิด 2FA ไว้: ยังไม่ออก session จำ challengeId ไว้แล้วให้หน้าเว็บ
        // สลับไปช่องใส่รหัส 6 หลัก (ขั้นที่ 2 เข้ามาทาง authorizeWithCode)
        if ("codeRequired" in result) {
          await setLoginChallenge(result.challengeId);
          throw new LoginError("CODE_REQUIRED");
        }

        return { ...result.user, access_token: result.access_token };
      },
    }),

    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (account?.provider === "google" && account.id_token) {
        // คนที่กด "Register as Instructor" ไว้ก่อนเลือกเข้าด้วย Google
        // เจตนานั้นรอดข้าม redirect มาได้ด้วยคุกกี้ตัวนี้ตัวเดียว
        const cookieStore = await cookies();
        const asInstructor =
          cookieStore.get(INSTRUCTOR_INTENT_COOKIE)?.value === "1";

        const { access_token, user: googleUser } =
          await AuthApi.loginWithGoogle(account.id_token, asInstructor);

        return fillToken(token, googleUser, access_token);
      }

      if (user) {
        fillToken(token, user as unknown as UserResponse, user.access_token);
      }

      if (trigger === "update" && session?.user) {
        if (session.user.firstName) {
          token.firstName = session.user.firstName;
        }

        if (session.user.lastName) {
          token.lastName = session.user.lastName;
        }

        if (session.user.email) {
          token.email = session.user.email;
        }

        if (typeof session.user.isInstructor === "boolean") {
          token.isInstructor = session.user.isInstructor;
        }

        // เปิดสิทธิ์สอนแล้ว API ออก token ใบใหม่มาให้ ต้องเปลี่ยนใบที่ถืออยู่
        if (session.user.access_token) {
          token.access_token = session.user.access_token;
        }

        if (session.user.avatarUrl !== undefined) {
          token.avatarUrl = session.user.avatarUrl;
        }
      }

      return token;
    },

    session({ token, session }) {
      session.user.id = token.sub;
      session.user.firstName = token.firstName;
      session.user.lastName = token.lastName;
      session.user.email = token.email;
      session.user.role = token.role;
      session.user.isInstructor = token.isInstructor;
      session.user.avatarUrl = token.avatarUrl;
      session.user.access_token = token.access_token;
      return session;
    },
  },
});
