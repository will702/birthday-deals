-- Run after EVERY `prisma db push` (Prisma cannot express these in schema.prisma, and
-- `db push` may drop them). All statements are idempotent.
--   npx prisma db execute --file prisma/sql/post-push.sql --schema prisma/schema.prisma
-- Prerequisite (once): prisma/sql/pgvector.sql

-- Vector similarity index
CREATE INDEX IF NOT EXISTS deal_embedding_hnsw ON "Deal" USING hnsw (embedding vector_cosine_ops);

-- Anonymous saves: one per visitor+deal while the row is not claimed by a user.
-- (User-owned rows are covered by @@unique([userId, dealId]) in schema.prisma.)
CREATE UNIQUE INDEX IF NOT EXISTS "SavedDeal_visitorId_dealId_anon_key"
  ON "SavedDeal" ("visitorId", "dealId") WHERE "userId" IS NULL;
