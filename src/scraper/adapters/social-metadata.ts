import * as cheerio from "cheerio";
import { assertPublicHttpUrl } from "../agent/ssrf";
import { fetchPage } from "../http";

export interface SocialMetadataResult {
  url: string;
  finalUrl: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
  accessible: boolean;
  blockedReason: string | null;
}

export async function extractSocialOrPageMetadata(url: string): Promise<SocialMetadataResult> {
  try {
    await assertPublicHttpUrl(url);
  } catch (err) {
    return {
      url,
      finalUrl: url,
      title: null,
      description: null,
      imageUrl: null,
      siteName: null,
      accessible: false,
      blockedReason: err instanceof Error ? err.message : "URL ditolak",
    };
  }

  const res = await fetchPage(url, { allowPlaywright: false, timeoutMs: 10_000 });
  if (res.blocked || !res.ok || !res.html) {
    return {
      url,
      finalUrl: res.finalUrl,
      title: null,
      description: null,
      imageUrl: null,
      siteName: null,
      accessible: false,
      blockedReason: res.blockReason ?? `HTTP ${res.status}`,
    };
  }

  const $ = cheerio.load(res.html);
  const title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").text().trim() ||
    null;
  const description =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    null;
  const imageUrl =
    $('meta[property="og:image"]').attr("content")?.trim() ||
    $('meta[name="twitter:image"]').attr("content")?.trim() ||
    null;
  const siteName =
    $('meta[property="og:site_name"]').attr("content")?.trim() || null;

  return {
    url,
    finalUrl: res.finalUrl,
    title,
    description,
    imageUrl,
    siteName,
    accessible: true,
    blockedReason: null,
  };
}
