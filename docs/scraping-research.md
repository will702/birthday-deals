# Scraping tooling research (2026-11-17)

Produced with the project skills `find-repo` and `find-skills`
(`.claude/skills/`, `.agents/skills/`). Re-run them when a new site type needs tooling:

```bash
python3 .claude/skills/find-repo/scripts/find_repo.py search "<intent>" -l TypeScript --min-stars 100 -n 6
python3 .claude/skills/find-repo/scripts/find_repo.py inspect owner/repo
npx skills find "<topic>"
```

## Candidate repos

| Repo | Stars | License | Health | Verdict |
| :-- | --: | :-- | :-- | :-- |
| mishushakov/llm-scraper | 6,957 | MIT | Active | **Pattern to copy, not a dependency.** "Webpage -> zod-schema structured data via an LLM" is exactly our extraction step; we implement it with the AI SDK directly. |
| apify/crawlee | 26,473 | Apache-2.0 | Active | **Defer.** Request queue, retries and proxy rotation overlap with our own retry/politeness work (Step 3). Revisit if we crawl many more sites. |
| browserbase/stagehand | 26,075 | MIT | Active | **Skip for now.** Full LLM browser-driving agent; heavy and costly for static promo pages. Revisit for login-walled or Instagram-style sources. |
| firecrawl/firecrawl | 202,448 | AGPL-3.0 | Active | **Do not embed.** AGPL conflicts with a closed deployment. Fine as an external API only. |
| vercel-labs/agent-browser | 52,197 | Apache-2.0 | Active | Dev-time CLI and skill for inspecting live pages while writing selectors. Not a runtime dependency. |

## Candidate skills (skills.sh)

| Skill | Installs | Notes |
| :-- | --: | :-- |
| vercel-labs/agent-browser@agent-browser | 1.5M | Official source. Not installed; offer to the user. |
| microsoft/playwright-cli@playwright-cli | 218.9K | Official source. Not installed; we already depend on Playwright. |
| scrapegraphai/just-scrape | 245K | Hosted third-party API. Not installed. |
| antibrow/anti-detect-browser-skills | 162.8K | **Rejected.** Detection evasion contradicts this project's robots.txt and honest-UA policy. |

## Decisions

| Layer | Decision |
| :-- | :-- |
| Fetching | Keep native `fetch` plus the existing `http.ts`; add retries, full-body timeout, robots.txt, per-host politeness. |
| Rendering | Keep Playwright, one shared browser per run. |
| Extraction | New: AI SDK 7 (`ai@7.0.x`, installed) `generateText({ output: Output.object({ schema }) })` with `"provider/model"` strings via Vercel AI Gateway and zod 3 schemas (the llm-scraper pattern). `generateObject` is deprecated in v6+. |
| Agent loop | New: `ToolLoopAgent` (`stopWhen: isStepCount(n)`) over our own `tool()` definitions (`fetchPage`, `renderPage`, `searchWeb`, `followLink`), with page/step/token budgets. |
| Crawling | Own bounded same-domain `followLink`; no Crawlee yet. |

AI SDK 7 APIs verified against `node_modules/ai/docs/` (03-agents, 03-ai-sdk-core/10-generating-structured-data,
55-testing). Tests use `MockLanguageModelV4` from `ai/test`. Requires Node >= 22 (local: 26).
