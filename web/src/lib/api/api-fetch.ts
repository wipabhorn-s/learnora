import { ApiError } from "@/lib/api/api-error";

export type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: Record<string, unknown> | FormData;
  token?: string;
};

const API_URL = process.env.API_URL ?? "http://localhost:8000";

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, headers, token, ...init } = options;

  const newHeaders = new Headers(headers);
  if (token) {
    newHeaders.set("Authorization", `Bearer ${token}`);
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
      Array.isArray(message) ? message.join(', ') : (message ?? response.statusText),
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
