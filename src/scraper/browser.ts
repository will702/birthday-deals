import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Browser } from "playwright";

async function findCachedChromiumExecutable(): Promise<string | undefined> {
  if (process.platform !== "darwin") return undefined;
  const cacheDir = path.join(os.homedir(), "Library", "Caches", "ms-playwright");
  if (!fs.existsSync(/* turbopackIgnore: true */ cacheDir)) return undefined;

  try {
    const entries = fs
      .readdirSync(/* turbopackIgnore: true */ cacheDir)
      .filter((name) => name.startsWith("chromium-") || name.startsWith("chromium_headless_shell-"))
      .sort()
      .reverse();

    for (const entry of entries) {
      const candidates = [
        path.join(
          cacheDir,
          entry,
          "chrome-mac-arm64",
          "Google Chrome for Testing.app",
          "Contents",
          "MacOS",
          "Google Chrome for Testing"
        ),
        path.join(
          cacheDir,
          entry,
          "chrome-headless-shell-mac-arm64",
          "chrome-headless-shell"
        ),
        path.join(cacheDir, entry, "chrome-linux", "chrome"),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(/* turbopackIgnore: true */ candidate)) return candidate;
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

let sharedBrowser: Promise<Browser | null> | null = null;

/** Returns the per-run shared browser, launching it on first use. */
export function getSharedBrowser(): Promise<Browser | null> {
  if (!sharedBrowser) sharedBrowser = launchHeadlessBrowser();
  return sharedBrowser;
}

export async function closeBrowser(): Promise<void> {
  if (!sharedBrowser) return;
  const pending = sharedBrowser;
  sharedBrowser = null;
  try {
    const browser = await pending;
    await browser?.close();
  } catch (err) {
    console.error("[scraper] closeBrowser failed:", err);
  }
}

export async function launchHeadlessBrowser(): Promise<Browser | null> {
  try {
    const { chromium } = await import("playwright");
    const defaultPath = chromium.executablePath();
    if (defaultPath && fs.existsSync(/* turbopackIgnore: true */ defaultPath)) {
      return await chromium.launch({ headless: true });
    }

    const cachedPath = await findCachedChromiumExecutable();
    if (cachedPath) {
      return await chromium.launch({ executablePath: cachedPath, headless: true });
    }

    // Fallback to installed Google Chrome on macOS
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return null;
  }
}
