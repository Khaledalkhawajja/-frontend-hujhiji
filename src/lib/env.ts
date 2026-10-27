/** API base URL, e.g. "http://localhost:4000/api/v1" or "/api/v1" (dev proxy). No trailing slash. */
export const API_URL: string = (import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1").replace(
  /\/+$/,
  "",
);

/** Origin of the API (scheme + host + port). Used to turn "/api/v1/..." paths into full links. */
export const API_ORIGIN: string = (() => {
  try {
    return new URL(API_URL).origin;
  } catch {
    // Relative base URL: the API is served from the same origin as the site (dev proxy).
    return typeof window === "undefined" ? "" : window.location.origin;
  }
})();

/**
 * Turns a path the API returns (avatar, camera photo) into something an <img> can load.
 * Paths starting with "/" belong to the API origin; full links (Cloudinary) are used as they are.
 */
export function apiAssetUrl(pathOrUrl: string | null | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith("/")) return `${API_ORIGIN}${pathOrUrl}`;
  return pathOrUrl;
}
