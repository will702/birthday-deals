import crypto from "node:crypto";

/**
 * Fail-closed admin check: returns false when ADMIN_TOKEN is unset/empty or
 * when the x-admin-token header does not match (timing-safe comparison).
 */
export function isAdminAuthorized(request: Request): boolean {
  const required = process.env.ADMIN_TOKEN;
  if (!required) return false;

  const provided = request.headers.get("x-admin-token");
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(required);
  if (a.length !== b.length) {
    // Keep timing roughly constant, then reject.
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}
