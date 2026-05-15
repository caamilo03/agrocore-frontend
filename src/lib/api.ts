import { clearAuth, getToken } from "./auth";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Drop-in replacement for fetch() that:
 *  - Prepends NEXT_PUBLIC_API_URL automatically
 *  - Injects Authorization: Bearer <token> when logged in
 *  - On 401: clears auth + redirects to /login
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getToken();

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (res.status === 401) {
    clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  return res;
}
