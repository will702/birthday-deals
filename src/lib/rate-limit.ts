import { clientIp } from "@/lib/request-ip";

/** Simple in-memory fixed-window limiter (per server instance; best-effort). */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
  now: number = Date.now(),
): boolean {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

export function resetRateLimits(): void {
  buckets.clear();
}

/**
 * Rate-limits by client IP (always) and by visitor id (when known). Returns true when allowed.
 * The IP bucket is a hard cap on cookie-clearing abuse; the visitor bucket is per identity.
 */
export function limitRequest(
  req: Request,
  scope: string,
  visitorId: string | null | undefined,
  limit = 60,
  windowMs = 60_000,
): boolean {
  const ipOk = rateLimit(`${scope}:ip:${clientIp(req)}`, limit * 2, windowMs);
  const visitorOk = visitorId ? rateLimit(`${scope}:v:${visitorId}`, limit, windowMs) : true;
  return ipOk && visitorOk;
}
