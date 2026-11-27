# UltahID MCP server

Read-only MCP server for the birthday-deals catalogue. No admin or write tools are exposed.

- Endpoint (Streamable HTTP): `https://<your-domain>/api/mcp/mcp` (local: `http://localhost:3000/api/mcp/mcp`)
- Rate limit: 60 requests/minute per IP.

## Tools

| Tool | Purpose |
| --- | --- |
| `search_deals` | Semantic + filter search (`query`, `category`, `city`, `discountType`, `freeOnly`, `noMinPurchase`, `limit`) |
| `get_deal` | Details of one deal by `slug` |
| `similar_deals` | Deals similar to a `slug` |
| `plan_birthday` | H-30..H+30 claim schedule (`birthdayDay`, `birthdayMonth` 1-12, `city`, `categories`) |

## Client config

Clients with Streamable HTTP support (Cursor, Claude Code, etc.):

```json
{
  "mcpServers": {
    "ultahid": { "url": "http://localhost:3000/api/mcp/mcp" }
  }
}
```

stdio-only clients (Claude Desktop) via `mcp-remote`:

```json
{
  "mcpServers": {
    "ultahid": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3000/api/mcp/mcp"]
    }
  }
}
```

Semantic search needs `AI_GATEWAY_API_KEY` (or `VERCEL_OIDC_TOKEN`) and embeddings backfilled (`npm run backfill`); otherwise it falls back to keyword search.
