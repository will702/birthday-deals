import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  CATEGORIES,
  DISCOUNT_TYPES,
  getDealCore,
  isValidBirthday,
  planBirthdayCore,
  searchDealsCore,
  similarCore,
} from "@/ai/deal-queries";

export const MCP_TOOL_NAMES = ["search_deals", "get_deal", "similar_deals", "plan_birthday"] as const;

function json(data: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
    ...(isError ? { isError: true } : {}),
  };
}

const READ_ONLY = { readOnlyHint: true, idempotentHint: true, openWorldHint: false } as const;

/** Registers the read-only UltahID tools. No admin or write tools belong here. */
export function registerMcpTools(server: McpServer): void {
  server.registerTool(
    "search_deals",
    {
      title: "Cari promo ulang tahun",
      description:
        "Search Indonesian birthday deals by free text (semantic) and filters. Returns compact deal records with /deals/{slug} URLs.",
      inputSchema: {
        query: z.string().max(200).optional(),
        category: z.enum(CATEGORIES).optional(),
        city: z.string().max(60).optional(),
        discountType: z.enum(DISCOUNT_TYPES).optional(),
        freeOnly: z.boolean().optional(),
        noMinPurchase: z.boolean().optional(),
        limit: z.number().int().min(1).max(10).default(5),
      },
      annotations: READ_ONLY,
    },
    async (input) => json(await searchDealsCore(input)),
  );

  server.registerTool(
    "get_deal",
    {
      title: "Detail promo",
      description: "Get details of one birthday deal by slug.",
      inputSchema: { slug: z.string().min(1).max(160) },
      annotations: READ_ONLY,
    },
    async ({ slug }) => {
      const { deal } = await getDealCore(slug);
      return deal ? json({ deal }) : json({ error: "Deal not found" }, true);
    },
  );

  server.registerTool(
    "similar_deals",
    {
      title: "Promo serupa",
      description: "Find deals similar to the given deal slug.",
      inputSchema: {
        slug: z.string().min(1).max(160),
        limit: z.number().int().min(1).max(10).default(5),
      },
      annotations: READ_ONLY,
    },
    async ({ slug, limit }) => json(await similarCore(slug, limit)),
  );

  server.registerTool(
    "plan_birthday",
    {
      title: "Rencana ulang tahun",
      description:
        "Build a claim schedule (H-30..H+30) with prep tasks for a birthday. Month is 1-12.",
      inputSchema: {
        birthdayDay: z.number().int().min(1).max(31),
        birthdayMonth: z.number().int().min(1).max(12),
        city: z.string().max(60).optional(),
        categories: z.array(z.enum(CATEGORIES)).max(5).optional(),
      },
      annotations: READ_ONLY,
    },
    async ({ birthdayDay, birthdayMonth, city, categories }) => {
      if (!isValidBirthday(birthdayDay, birthdayMonth)) {
        return json({ error: "Invalid birthday date" }, true);
      }
      return json(await planBirthdayCore({ day: birthdayDay, month: birthdayMonth, city, categories }));
    },
  );
}
