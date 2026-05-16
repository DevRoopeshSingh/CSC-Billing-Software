// src/lib/api-client.ts
// Thin typed fetch wrapper. Replaces src/lib/ipc.ts for routes that have been
// migrated to HTTP. The IPC client stays alive for pages that haven't moved
// yet — they're independent.
//
// Contract parity with ipc.ts:
//   - 2xx → resolves with parsed JSON
//   - non-2xx with { error } → rejects with ApiError(message, code?)
//   - network error → rejects with ApiError(message, "NETWORK_ERROR")
//
// CSRF: for non-GET methods we read the csc_csrf cookie (set by the server on
// login/setup/resume) and send it as x-csrf-token. GETs skip the header.

const CSRF_COOKIE = "csc_csrf";
const CSRF_HEADER = "x-csrf-token";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function readCsrf(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CSRF_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(CSRF_COOKIE.length + 1)) : null;
}

async function unwrap<T>(res: Response): Promise<T> {
  const text = await res.text();
  const body: unknown = text ? safeJson(text) : null;
  if (!res.ok) {
    const message =
      (typeof body === "object" && body && "error" in body && typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : null) ?? `Request failed (${res.status})`;
    const code =
      typeof body === "object" && body && "code" in body && typeof (body as { code: unknown }).code === "string"
        ? (body as { code: string }).code
        : undefined;
    throw new ApiError(message, res.status, code);
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

interface RequestOpts {
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function request<T>(
  method: string,
  path: string,
  opts: RequestOpts = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers ?? {}),
  };
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (opts.body instanceof FormData) {
      // Let fetch set the multipart boundary itself. Setting Content-Type
      // here would strip the boundary and the server would fail to parse.
      body = opts.body;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
  }
  if (method !== "GET" && method !== "HEAD") {
    const csrf = readCsrf();
    if (csrf) headers[CSRF_HEADER] = csrf;
  }
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers,
      body,
      signal: opts.signal,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    throw new ApiError(message, 0, "NETWORK_ERROR");
  }
  return unwrap<T>(res);
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOpts, "body">) =>
    request<T>("GET", path, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOpts) =>
    request<T>("POST", path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOpts) =>
    request<T>("PATCH", path, { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOpts) =>
    request<T>("PUT", path, { ...opts, body }),
  delete: <T>(path: string, opts?: RequestOpts) =>
    request<T>("DELETE", path, opts),
};
