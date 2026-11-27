import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  // Daily scrape. Vercel sends `Authorization: Bearer $CRON_SECRET` (set CRON_SECRET in the project
  // env); /api/scraper/run accepts it as an alternative to x-admin-token. Path schedules default to POST.
  schedules: {
    "scraper-daily": {
      schedule: "0 20 * * *", // 20:00 UTC = 03:00 WIB
      path: "/api/scraper/run",
      requestMethod: "POST",
    },
  },
};
