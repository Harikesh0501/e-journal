/**
 * Base API client utility for backend communication.
 *
 * RULE-FE08: Frontend NEVER makes direct database connections.
 * All data flows through authenticated backend APIs.
 */

declare global {
  interface Window {
    __IS_LOGGING_OUT?: boolean;
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/** Standard API error response shape */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/** Standard API response envelope */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

/** Custom error class for API failures */
export class ApiRequestError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("ejournal_token", token);
  localStorage.setItem("ejournal_token", token);
  const isSecure = window.location.protocol === "https:";
  document.cookie = `access_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax${isSecure ? "; Secure" : ""}`;
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem("ejournal_token");
    sessionStorage.removeItem("ejournal_session_active");
    localStorage.removeItem("ejournal_token");

    const isSecure = window.location.protocol === "https:";
    const secureFlags = isSecure ? "; Secure" : "";

    // 1. Clear root path with Lax and Secure
    document.cookie = `access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax${secureFlags}`;
    // 2. Clear root path with None and Secure
    document.cookie = `access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=None${secureFlags}`;
    // 3. Clear standard root
    document.cookie = `access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
    // 4. Clear current domain
    const hostname = window.location.hostname;
    document.cookie = `access_token=; path=/; domain=${hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0${secureFlags}`;
  } catch (e) {
    console.error("Failed to clear auth token:", e);
  }
}

/**
 * Core fetch wrapper with response envelope handling.
 *
 * - Automatically parses the response envelope
 * - Throws ApiRequestError on failure responses
 * - Includes credentials for HTTP-only cookie auth (RULE-AUTH01)
 * - Injects Authorization Bearer header for cross-origin deployments
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  let token: string | null = null;
  if (typeof window !== "undefined") {
    token =
      sessionStorage.getItem("ejournal_token") ||
      localStorage.getItem("ejournal_token");
    if (!token) {
      const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }
  }

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body: ApiResponse<T> = await response.json();

  if (!body.success || body.error) {
    // Force clear JWT cookie at root path if authentication is rejected (prevents Next.js loops)
    if (
      response.status === 401 ||
      body.error?.code === "UNAUTHORIZED" ||
      body.error?.code === "INVALID_TOKEN" ||
      body.error?.code === "USER_NOT_FOUND"
    ) {
      clearAuthToken();
      // Do not dispatch session expired modal if logging out, on auth pages, or root
      if (
        typeof window !== "undefined" &&
        !(window as any).__IS_LOGGING_OUT &&
        !endpoint.includes("/auth/logout") &&
        !window.location.pathname.startsWith("/auth") &&
        window.location.pathname !== "/"
      ) {
        window.dispatchEvent(new Event("unauthorized"));
      }
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch (err) {
        // Ignore logout network exceptions
      }
    }

    throw new ApiRequestError(
      body.error?.code || "UNKNOWN_ERROR",
      body.error?.message || "An unexpected error occurred",
      response.status,
      body.error?.details
    );
  }

  return body.data as T;
}

/** API client methods */
export const api = {
  get: <T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined | null>
  ) => {
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, String(value));
        }
      });
      const qs = searchParams.toString();
      return request<T>(qs ? `${endpoint}?${qs}` : endpoint, { method: "GET" });
    }
    return request<T>(endpoint, { method: "GET" });
  },

  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
};
