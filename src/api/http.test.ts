import { http, HttpResponse, delay } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { API_URL } from "@/lib/env";
import {
  ApiError,
  __resetHttpStateForTests,
  buildUrl,
  download,
  request,
  setAuthFailureHandler,
} from "./http";

const url = (path: string) => `${API_URL}${path}`;
const ok = <T>(data: T) => HttpResponse.json({ statusCode: 200, data, message: "ok", success: true });
const unauthorized = () =>
  HttpResponse.json({ success: false, message: "Unauthorized request" }, { status: 401 });

// A tiny fake backend: the access token is "valid" only after a refresh has happened.
let sessionValid = false;
let refreshCalls = 0;
let refreshSucceeds = true;
let coursesCalls = 0;

const server = setupServer(
  http.post(url("/users/refresh-token"), async () => {
    refreshCalls += 1;
    await delay(30); // long enough for concurrent requests to pile up behind it
    if (!refreshSucceeds) return unauthorized();
    sessionValid = true;
    return ok({});
  }),
  http.get(url("/courses"), () => {
    coursesCalls += 1;
    return sessionValid
      ? ok({ courses: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })
      : unauthorized();
  }),
  http.get(url("/sections/my"), () => (sessionValid ? ok([]) : unauthorized())),
  http.get(url("/universities"), () =>
    sessionValid ? ok([{ _id: "u1", name: "Demo", location: "Amman" }]) : unauthorized(),
  ),
  http.get(url("/always-401"), () => unauthorized()),
  http.post(url("/users/login"), () =>
    HttpResponse.json({ success: false, message: "Invalid user credentials" }, { status: 401 }),
  ),
  http.post(url("/courses"), () =>
    HttpResponse.json(
      { success: false, message: "Validation failed.", errors: ["courseNo is required"] },
      { status: 400 },
    ),
  ),
  http.get(url("/health"), () =>
    HttpResponse.json({ status: "ok", mongo: true, redis: true, uptimeSeconds: 5 }),
  ),
  http.get(url("/reports/summary.csv"), () =>
    sessionValid
      ? new HttpResponse("section,lectures\nCS101-01,3\n", {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": 'attachment; filename="summary.csv"',
          },
        })
      : unauthorized(),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
beforeEach(() => {
  __resetHttpStateForTests();
  sessionValid = false;
  refreshCalls = 0;
  refreshSucceeds = true;
  coursesCalls = 0;
});

describe("http client: 401 -> refresh -> retry", () => {
  it("refreshes once and retries the original request", async () => {
    const data = await request<{ courses: unknown[] }>("/courses");
    expect(data.courses).toEqual([]);
    expect(refreshCalls).toBe(1);
    expect(coursesCalls).toBe(2); // first try (401) + retry
  });

  it("concurrent 401s share ONE refresh", async () => {
    const results = await Promise.all([
      request("/courses"),
      request("/sections/my"),
      request("/universities"),
      request("/courses"),
      request("/sections/my"),
    ]);
    expect(results).toHaveLength(5);
    expect(refreshCalls).toBe(1);
  });

  it("a 401 that arrives after a refresh already finished retries without refreshing again", async () => {
    // First request triggers and completes a refresh.
    await request("/courses");
    expect(refreshCalls).toBe(1);
    // The session is valid now, so later requests just work and never refresh.
    await Promise.all([request("/courses"), request("/universities")]);
    expect(refreshCalls).toBe(1);
  });

  it("when the refresh fails, it reports an auth failure and rejects with 401", async () => {
    refreshSucceeds = false;
    const onFailure = vi.fn();
    setAuthFailureHandler(onFailure);
    await expect(request("/courses")).rejects.toMatchObject({ status: 401 });
    expect(refreshCalls).toBe(1);
    expect(onFailure).toHaveBeenCalledTimes(1);
  });

  it("concurrent requests with a failed refresh still refresh only once", async () => {
    refreshSucceeds = false;
    const onFailure = vi.fn();
    setAuthFailureHandler(onFailure);
    const settled = await Promise.allSettled([
      request("/courses"),
      request("/sections/my"),
      request("/universities"),
    ]);
    expect(settled.every((r) => r.status === "rejected")).toBe(true);
    expect(refreshCalls).toBe(1);
  });

  it("retries only once: a second 401 does not loop", async () => {
    const onFailure = vi.fn();
    setAuthFailureHandler(onFailure);
    await expect(request("/always-401")).rejects.toBeInstanceOf(ApiError);
    expect(refreshCalls).toBe(1);
    expect(onFailure).toHaveBeenCalledTimes(1);
  });

  it("login failures never trigger a refresh", async () => {
    await expect(
      request("/users/login", {
        method: "POST",
        body: { email: "a@b.c", password: "x" },
        skipAuthRefresh: true,
      }),
    ).rejects.toMatchObject({ status: 401, message: "Invalid user credentials" });
    expect(refreshCalls).toBe(0);
  });
});

describe("http client: envelope and errors", () => {
  it("unwraps `data` from the success envelope", async () => {
    sessionValid = true;
    await expect(request("/universities")).resolves.toEqual([{ _id: "u1", name: "Demo", location: "Amman" }]);
  });

  it("turns error bodies into ApiError with message and errors", async () => {
    sessionValid = true;
    const error = await request("/courses", { method: "POST", body: {} }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      message: "Validation failed.",
      errors: ["courseNo is required"],
    });
  });

  it("reads the unwrapped health response", async () => {
    await expect(request("/health", { unwrapped: true, skipAuthRefresh: true })).resolves.toMatchObject({
      status: "ok",
    });
  });

  it("downloads files with the filename from Content-Disposition, refreshing first if needed", async () => {
    const file = await download("/reports/summary.csv");
    expect(file.filename).toBe("summary.csv");
    expect(await file.blob.text()).toContain("CS101-01");
    expect(refreshCalls).toBe(1);
  });

  it("builds query strings and drops empty values", () => {
    expect(buildUrl("/users", { type: "STUDENT", search: "", page: 2, limit: undefined })).toBe(
      `${API_URL}/users?type=STUDENT&page=2`,
    );
  });
});
