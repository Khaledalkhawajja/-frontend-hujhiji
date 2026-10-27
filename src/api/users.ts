// Account endpoints (docs/FRONTEND_GUIDE.md section 6, "Account / users").
// Phase 0 only needs the session calls; the rest of this file grows in Phase 1 and 4.
import { request } from "./http";
import type { User } from "@/types/models";

export interface LoginInput {
  email: string;
  password: string;
}

/** Sets the login cookies. Returns no user: call getCurrentUser() afterwards. */
export function login(input: LoginInput): Promise<void> {
  // A 401 here means wrong email/password (or account not activated), not an expired session.
  return request<void>("/users/login", { method: "POST", body: input, skipAuthRefresh: true });
}

export function logout(): Promise<void> {
  return request<void>("/users/logout", { method: "POST", body: {} });
}

export function getCurrentUser(): Promise<User> {
  return request<User>("/users/current-user");
}
