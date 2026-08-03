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
    const errorBody = await response.json();
    throw new ApiError(response.status, errorBody.message);
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
