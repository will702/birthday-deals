import { describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const q = vi.hoisted(() => ({
  searchDealsCore: vi.fn(),
  getDealCore: vi.fn(),
  similarCore: vi.fn(),
  planBirthdayCore: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/ai/deal-queries", async (orig) => ({
  ...(await orig<typeof import("../src/ai/deal-queries")>()),
  ...q,
}));

import { MCP_TOOL_NAMES, registerMcpTools } from "../src/ai/mcp-tools";

async function connect() {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerMcpTools(server);
  const client = new Client({ name: "c", version: "0.0.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

describe("MCP tools", () => {
  it("lists exactly the four read-only tools", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([...MCP_TOOL_NAMES].sort());
    for (const t of tools) expect(t.annotations?.readOnlyHint).toBe(true);
  });

  it("calls search_deals through the shared core", async () => {
    q.searchDealsCore.mockResolvedValue({ deals: [{ slug: "a" }] });
    const client = await connect();
    const res = await client.callTool({ name: "search_deals", arguments: { query: "kopi" } });
    expect(q.searchDealsCore).toHaveBeenCalledWith(expect.objectContaining({ query: "kopi", limit: 5 }));
    expect(JSON.stringify(res.content)).toContain("\\\"slug\\\":\\\"a\\\"");
  });

  it("flags invalid birthdays as errors", async () => {
    const client = await connect();
    const res = await client.callTool({
      name: "plan_birthday",
      arguments: { birthdayDay: 31, birthdayMonth: 4 },
    });
    expect(res.isError).toBe(true);
    expect(q.planBirthdayCore).not.toHaveBeenCalled();
  });
});
