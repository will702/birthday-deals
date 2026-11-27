This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Local scraping (scrape locally, push to Neon later)

Uses a local pgvector Postgres (Docker container `ultahid-pg` on port 54329). Connection lives in the
gitignored `.env.scrape-local` (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `PRISMA_NO_ADAPTER=1`).

```bash
npm run db:local:setup            # once: pgvector + schema + post-push indexes on the local DB
npm run db:local:pull             # copy remote deals/proofs/runs/embeddings into local (dedup baseline)
npm run scrape:local -- --no-freshness   # same flags as `npm run scrape`
npm run db:local:push             # preview: new / updated deals, runs, conflicts
npm run db:local:push -- --apply  # write to the remote (Neon) database
```

Push only moves scraper data (deals, embeddings, proofs of new deals, scrape runs). A deal edited on remote
after the last pull is skipped as a conflict; pull again and re-scrape to pick it up. `pull` refuses to
overwrite unpushed local changes unless given `--force`. Push never deletes: deals removed locally (duplicates,
junk) must also be deleted on remote.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
