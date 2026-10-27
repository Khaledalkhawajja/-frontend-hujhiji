// The ONLY place in the app that calls fetch.
// - Base URL from VITE_API_URL, every request sends cookies (credentials: "include").
// - Unwraps the { statusCode, data, message, success } envelope; errors become ApiError(message, status, errors).
// - On 401: one shared refresh (POST /users/refresh-token), then the request is retried once.
//   Concurrent 401s wait for the same refresh: two refreshes at once look like token theft to the backend.
import { API_URL } from "@/lib/env";
import type { ApiFailure, ApiSuccess } from "@/types/api";

export class ApiError extends Error {
  readonly status: number;
  readonly errors?: string[];

  constructor(message: string, status: number, errors?: string[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export type QueryValue = string | number | boolean | null | undefined;
export type Query = Record<string, QueryValue>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Query;
  /** JSON body. */
  body?: unknown;
  /** Multipart body. The browser sets Content-Type (with the boundary) itself. */
  form?: FormData;
  signal?: AbortSignal;
  /** Do not try to refresh on 401 (login, refresh itself, public pages). */
  skipAuthRefresh?: boolean;
  /** The response is plain JSON without the { data } envelope (only GET /health). */
  unwrapped?: boolean;
}

export interface DownloadedFile {
  blob: Blob;
  /** From the Content-Disposition header, when present. */
  filename?: string;
}

const REFRESH_PATH = "/users/refresh-token";

let refreshInFlight: Promise<boolean> | null = null;
/** Increases after every successful refresh, so a late 401 can tell a refresh already happened. */
let refreshGeneration = 0;
let onAuthFailure: (() => void) | null = null;

/** Called once when the session cannot be renewed (refresh failed). The app uses it to go to the login page. */
export function setAuthFailureHandler(handler: (() => void) | null): void {
  onAuthFailure = handler;
}

export function buildUrl(path: string, query?: Query): string {
  const url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function send(path: string, options: RequestOptions, accept: string): Promise<Response> {
  const headers: Record<string, string> = { Accept: accept };
  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  return fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    credentials: "include",
    headers,
    body,
    signal: options.signal,
  }).catch((error: unknown) => {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  });
}

/** Renews the session. Every caller shares the same in-flight call. */
export function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(buildUrl(REFRESH_PATH), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: "{}",
    })
      .then((res) => {
        if (res.ok) refreshGeneration += 1;
        return res.ok;
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function sendWithRefresh(path: string, options: RequestOptions, accept: string): Promise<Response> {
  const generationAtSend = refreshGeneration;
  const res = await send(path, options, accept);
  if (res.status !== 401 || options.skipAuthRefresh) return res;

  let renewed: boolean;
  if (refreshInFlight) renewed = await refreshInFlight;
  else if (refreshGeneration > generationAtSend)
    renewed = true; // someone already refreshed after we sent
  else renewed = await refreshSession();

  if (!renewed) {
    onAuthFailure?.();
    return res;
  }
  const retried = await send(path, options, accept);
  if (retried.status === 401) onAuthFailure?.();
  return retried;
}

async function toApiError(res: Response): Promise<ApiError> {
  let message = res.statusText || `Request failed (${res.status})`;
  let errors: string[] | undefined;
  try {
    const payload = (await res.json()) as Partial<ApiFailure>;
    if (payload && typeof payload.message === "string") message = payload.message;
    if (Array.isArray(payload?.errors)) errors = payload.errors;
  } catch {
    // Not JSON (e.g. a proxy error page): keep the status text.
  }
  return new ApiError(message, res.status, errors);
}

/** JSON request. Resolves with the envelope's `data`. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await sendWithRefresh(path, options, "application/json");
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  if (options.unwrapped) return JSON.parse(text) as T;
  const payload = JSON.parse(text) as ApiSuccess<T> | ApiFailure;
  if (payload.success === false) throw new ApiError(payload.message, res.status, payload.errors);
  return payload.data;
}

/** Binary download (CSV reports, images) with the same cookie and refresh handling. */
export async function download(path: string, options: RequestOptions = {}): Promise<DownloadedFile> {
  const res = await sendWithRefresh(path, options, "*/*");
  if (!res.ok) throw await toApiError(res);
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return { blob: await res.blob(), filename: match ? decodeURIComponent(match[1]) : undefined };
}

/** Test helper: forget refresh state between tests. */
export function __resetHttpStateForTests(): void {
  refreshInFlight = null;
  refreshGeneration = 0;
  onAuthFailure = null;
}
