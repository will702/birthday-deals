import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/visitor", () => ({
  getViewer: vi.fn().mockResolvedValue({ visitorId: "visitor-1", userId: null }),
}));
vi.mock("@/ai/tools", () => ({ createDealTools: vi.fn(() => ({})) }));

import { POST } from "../src/app/api/chat/route";
import { resetRateLimits } from "../src/lib/rate-limit";

const KEYS = ["AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN"] as const;
const saved: Record<string, string | undefined> = {};

function chatReq(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const goodBody = {
  messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "halo" }] }],
};

describe("POST /api/chat", () => {
  beforeEach(() => {
    for (const k of KEYS) saved[k] = process.env[k];
    resetRateLimits();
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("returns 503 when AI credentials are missing", async () => {
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.VERCEL_OIDC_TOKEN;
    const res = await POST(chatReq(goodBody));
    expect(res.status).toBe(503);
  });

  it("returns 400 for invalid messages", async () => {
    process.env.AI_GATEWAY_API_KEY = "test-key";
    const res = await POST(chatReq({ messages: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 429 once the per-visitor limit is exceeded", async () => {
    process.env.AI_GATEWAY_API_KEY = "test-key";
    // Invalid bodies still consume the limiter but never reach the model.
    let last = 0;
    for (let i = 0; i < 21; i++) last = (await POST(chatReq({ messages: [] }))).status;
    expect(last).toBe(429);
  });
});
