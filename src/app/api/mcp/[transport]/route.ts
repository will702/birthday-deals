import { createMcpHandler } from "mcp-handler";
import { NextResponse } from "next/server";
import { registerMcpTools } from "@/ai/mcp-tools";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

export const maxDuration = 60;

const handler = createMcpHandler(
  (server) => registerMcpTools(server),
  { serverInfo: { name: "ultahid", version: "1.0.0" } },
  { basePath: "/api/mcp", maxDuration: 60, disableSse: true },
);

async function guarded(req: Request): Promise<Response> {
  if (!rateLimit(`mcp:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
  }
  return handler(req);
}

export { guarded as GET, guarded as POST, guarded as DELETE };
