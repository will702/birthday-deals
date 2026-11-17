import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

export type LookupFn = (
  hostname: string,
) => Promise<Array<{ address: string; family: number }>>;

const defaultLookup: LookupFn = (hostname) =>
  dnsLookup(hostname, { all: true, verbatim: true });

const ALLOWED_PORTS = new Set(["", "80", "443"]);

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

function isPrivateIPv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)
  ) {
    return true; // unparseable: fail closed
  }
  const [a, b] = parts;
  return (
    a === 0 || // 0.0.0.0/8
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224 // multicast, reserved, broadcast
  );
}

function expandIPv6(address: string): number[] | null {
  let addr = address.toLowerCase().split("%")[0];
  // Embedded IPv4 tail (e.g. ::ffff:1.2.3.4)
  const v4 = addr.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const o = v4[1].split(".").map(Number);
    if (o.some((n) => n > 255)) return null;
    addr =
      addr.slice(0, -v4[1].length) +
      ((o[0] << 8) | o[1]).toString(16) +
      ":" +
      ((o[2] << 8) | o[3]).toString(16);
  }
  const halves = addr.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 0) return null;
  const groups = [
    ...head,
    ...Array(halves.length === 2 ? missing : 0).fill("0"),
    ...tail,
  ];
  const nums = groups.map((g) => parseInt(g, 16));
  if (
    nums.length !== 8 ||
    nums.some((n) => !Number.isFinite(n) || n < 0 || n > 0xffff)
  )
    return null;
  return nums;
}

function isPrivateIPv6(address: string): boolean {
  const g = expandIPv6(address);
  if (!g) return true;
  if (g.every((n) => n === 0)) return true; // ::
  if (g.slice(0, 7).every((n) => n === 0) && g[7] === 1) return true; // ::1
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10
  if ((g[0] & 0xff00) === 0xff00) return true; // multicast
  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible: judge by the embedded IPv4
  if (g.slice(0, 5).every((n) => n === 0) && (g[5] === 0xffff || g[5] === 0)) {
    return isPrivateIPv4(
      `${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`,
    );
  }
  return false;
}

export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPrivateIPv4(address);
  if (family === 6) return isPrivateIPv6(address);
  return true;
}

/**
 * Throws UnsafeUrlError unless `rawUrl` is an http(s) URL on a default port whose host resolves
 * only to public addresses. Note: this cannot stop DNS rebinding between check and fetch; callers
 * should also re-check the final URL after redirects.
 */
export async function assertPublicHttpUrl(
  rawUrl: string,
  lookup: LookupFn = defaultLookup,
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("URL tidak valid");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Hanya http/https yang diizinkan");
  }
  if (url.username || url.password)
    throw new UnsafeUrlError("URL dengan kredensial ditolak");
  if (!ALLOWED_PORTS.has(url.port))
    throw new UnsafeUrlError("Port non-standar ditolak");

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new UnsafeUrlError("Host lokal ditolak");
  }

  if (isIP(host)) {
    if (isPrivateAddress(host))
      throw new UnsafeUrlError("Alamat IP privat ditolak");
    return url;
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(host);
  } catch {
    throw new UnsafeUrlError("Host tidak dapat di-resolve");
  }
  if (addresses.length === 0)
    throw new UnsafeUrlError("Host tidak dapat di-resolve");
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    throw new UnsafeUrlError("Host mengarah ke alamat privat");
  }
  return url;
}
