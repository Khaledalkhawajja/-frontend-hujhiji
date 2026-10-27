import { request } from "./http";
import type { HealthStatus } from "@/types/models";

/** GET /health (not wrapped in the usual envelope). 503 ("down") means the database is unreachable. */
export function getHealth(): Promise<HealthStatus> {
  return request<HealthStatus>("/health", { skipAuthRefresh: true, unwrapped: true });
}
