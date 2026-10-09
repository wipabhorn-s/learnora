import { ApiError } from "@/lib/api/api-error";
import { env } from "@/lib/env";
import { headers as requestHeaders } from "next/headers";
import { redirect } from "next/navigation";

/** route handler ที่ล้าง session แล้วพาไปหน้า login (app/session-expired) */
const SESSION_EXPIRED_PATH = "/session-expired";

export type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: Record<string, unknown> | FormData;
  token?: string;
  /** IP ของผู้ใช้ ส่งเองได้ในที่ที่อ่าน header ของคำขอไม่ได้ (เช่น proxy.ts) */
  clientIp?: string;
};

/** IP แรกใน X-Forwarded-For = เครื่องของผู้ใช้ (ตัวถัดไปคือ proxy ระหว่างทาง) */
export function clientIpFrom(source: Headers): string | undefined {
  return (
    source.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    source.get("x-real-ip") ||
    undefined
  );
}

/**
 * IP ของผู้ใช้ที่กำลังเปิดหน้าเว็บอยู่ API ใช้นับ rate limit ต่อคน
 * ไม่ส่ง = API เห็นทุกคนเป็น IP ของ server เว็บ แล้วใช้โควตาร่วมกันทั้งเว็บ
 * นอกคำขอ (เช่นตอน build) อ่าน header ไม่ได้ ก็ไม่ส่ง
 */
async function currentClientIp(): Promise<string | undefined> {
  try {
    return clientIpFrom(await requestHeaders());
  } catch {
    return undefined;
  }
}

const API_URL = env.API_URL;

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, headers, token, clientIp, ...init } = options;

  const newHeaders = new Headers(headers);
  if (token) {
    newHeaders.set("Authorization", `Bearer ${token}`);
  }

  const ip = clientIp ?? (await currentClientIp());
  if (ip) {
    newHeaders.set("X-Forwarded-For", ip);
  }

  if (body !== undefined && !(body instanceof FormData)) {
    newHeaders.set("Content-Type", "application/json");
  }

  const newBody = body instanceof FormData ? body : JSON.stringify(body);

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    body: newBody,
    headers: newHeaders,
  });

  // ส่ง token ไปแล้วโดน 401 = session ที่ถืออยู่ใช้ไม่ได้แล้ว (token หมดอายุ
  // บัญชีถูกลบ หรือโดนระงับ) ล็อกเอาต์ให้เลยแทนที่จะปล่อยให้หน้าพังเป็น error
  // redirect() ทำงานด้วยการ throw จึงหยุดทั้ง server component และ action ตรงนี้
  if (token && response.status === 401) {
    redirect(SESSION_EXPIRED_PATH);
  }

  if (!response.ok) {
    // body ของ Nest เป็น { message, statusCode } ปกติ แต่ endpoint ที่ต้องให้
    // ฝั่งเว็บแยกเคสได้จะแนบ code มาด้วย และบาง error (เช่น validation)
    // ส่ง message มาเป็น array
    const errorBody: unknown = await response.json().catch(() => null);
    const { message, code } = (errorBody ?? {}) as {
      message?: string | string[];
      code?: string;
    };

    throw new ApiError(
      response.status,
      Array.isArray(message)
        ? message.join(", ")
        : (message ?? response.statusText),
      code,
    );
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}
