import { describe, expect, it } from "vitest";
import { assertPublicHttpUrl, type LookupFn } from "../src/scraper/agent/ssrf";

const lookup: LookupFn = async (host) => {
  const map: Record<string, string> = {
    "public.test": "93.184.216.34",
    "rebind.test": "10.0.0.5",
    "v6.test": "2606:4700:4700::1111",
    "mapped.test": "::ffff:127.0.0.1",
  };
  const address = map[host];
  if (!address) throw new Error("ENOTFOUND");
  return [{ address, family: address.includes(":") ? 6 : 4 }];
};

describe("assertPublicHttpUrl", () => {
  it.each([
    "https://public.test/promo",
    "http://public.test/",
    "https://v6.test/",
    "https://93.184.216.34/",
  ])("allows %s", async (url) => {
    await expect(assertPublicHttpUrl(url, lookup)).resolves.toBeInstanceOf(URL);
  });

  it.each([
    "http://127.0.0.1/",
    "http://10.1.2.3/",
    "http://172.16.0.1/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data",
    "http://0.0.0.0/",
    "http://localhost/",
    "http://foo.localhost/",
    "http://[::1]/",
    "http://[fe80::1]/",
    "http://[fc00::1]/",
    "http://[::ffff:127.0.0.1]/",
    "file:///etc/passwd",
    "ftp://public.test/",
    "https://public.test:8080/",
    "https://user:pw@public.test/",
    "http://rebind.test/",
    "http://mapped.test/",
    "http://nxdomain.test/",
    "not a url",
  ])("rejects %s", async (url) => {
    await expect(assertPublicHttpUrl(url, lookup)).rejects.toThrow();
  });
});
