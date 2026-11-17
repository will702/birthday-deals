import pLimit from "p-limit";

type SleepFn = (ms: number) => Promise<void>;

const defaultSleep: SleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DEFAULT_MIN_DELAY_MS = 1000;

interface HostState {
  limit: ReturnType<typeof pLimit>;
  lastFinishedAt: number;
}

const hosts = new Map<string, HostState>();

function defaultMinDelayMs(): number {
  const fromEnv = Number.parseInt(process.env.SCRAPER_MIN_DELAY_MS ?? "", 10);
  return Number.isFinite(fromEnv) && fromEnv >= 0 ? fromEnv : DEFAULT_MIN_DELAY_MS;
}

function hostKey(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return url;
  }
}

/**
 * Serializes requests per hostname and enforces a minimum gap between the end of
 * one request and the start of the next one to the same host.
 */
export async function withHostPoliteness<T>(
  url: string,
  task: () => Promise<T>,
  options: { minDelayMs?: number; sleep?: SleepFn } = {}
): Promise<T> {
  const key = hostKey(url);
  let state = hosts.get(key);
  if (!state) {
    state = { limit: pLimit(1), lastFinishedAt: 0 };
    hosts.set(key, state);
  }
  const hostState = state;
  const minDelayMs = options.minDelayMs ?? defaultMinDelayMs();
  const sleep = options.sleep ?? defaultSleep;

  return hostState.limit(async () => {
    const waitMs = hostState.lastFinishedAt + minDelayMs - Date.now();
    if (hostState.lastFinishedAt > 0 && waitMs > 0) await sleep(waitMs);
    try {
      return await task();
    } finally {
      hostState.lastFinishedAt = Date.now();
    }
  });
}

export function resetPoliteness(): void {
  hosts.clear();
}
