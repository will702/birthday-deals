import crypto from "node:crypto";
import { embed, embedMany } from "ai";
import { prisma } from "@/lib/prisma";

export const DEFAULT_EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

export interface SimilarHit {
  dealId: string;
  similarity: number;
}

export function embeddingModelId(): string {
  return process.env.EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;
}

/** True when AI Gateway credentials are available (API key or Vercel OIDC token). */
export function hasGatewayCredentials(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim());
}

export interface EmbeddableDeal {
  brandName: string;
  category: string;
  title: string;
  discountType: string;
  discountValue: number | null;
  description: string;
  claimWindow: string;
  cities: string[];
  tags: string[];
  requiresApp?: boolean;
  appName?: string | null;
}

export function dealEmbeddingText(deal: EmbeddableDeal): string {
  const parts = [
    `${deal.brandName} - ${deal.title}`,
    `Kategori: ${deal.category}`,
    `Tipe promo: ${deal.discountType}${deal.discountValue ? ` ${deal.discountValue}` : ""}`,
    `Periode klaim: ${deal.claimWindow}`,
    deal.cities.length > 0 ? `Kota: ${deal.cities.join(", ")}` : "",
    deal.tags.length > 0 ? `Tag: ${deal.tags.join(", ")}` : "",
    deal.requiresApp ? `Wajib aplikasi${deal.appName ? ` ${deal.appName}` : ""}` : "",
    deal.description,
  ];
  return parts.filter(Boolean).join("\n").slice(0, 4000);
}

export function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

export function embeddingTextHash(text: string): string {
  return crypto.createHash("sha1").update(`${embeddingModelId()}\n${text}`).digest("hex");
}

/**
 * Embeds the given deals and stores vectors. Deals whose embedding text (and model) is
 * unchanged since the last embedding are skipped unless `force` is set.
 * Returns how many were written; never throws.
 */
export async function embedDeals(ids: string[], options: { force?: boolean } = {}): Promise<number> {
  if (ids.length === 0 || !hasGatewayCredentials()) return 0;
  try {
    const deals = await prisma.deal.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        brandName: true,
        category: true,
        title: true,
        discountType: true,
        discountValue: true,
        description: true,
        claimWindow: true,
        cities: true,
        tags: true,
        requiresApp: true,
        appName: true,
        embeddingHash: true,
        embeddingUpdatedAt: true,
      },
    });

    const items = deals
      .map((d) => {
        const text = dealEmbeddingText(d);
        return { id: d.id, text, hash: embeddingTextHash(text), prev: d };
      })
      .filter((i) => options.force || !i.prev.embeddingUpdatedAt || i.prev.embeddingHash !== i.hash);
    if (items.length === 0) return 0;

    const { embeddings } = await embedMany({
      model: embeddingModelId(),
      values: items.map((i) => i.text),
    });

    let written = 0;
    for (let i = 0; i < items.length; i++) {
      const vec = embeddings[i];
      if (!vec || vec.length !== EMBEDDING_DIMENSIONS) continue;
      await prisma.$executeRaw`
        UPDATE "Deal"
        SET embedding = ${toVectorLiteral(vec)}::vector, "embeddingUpdatedAt" = NOW(),
            "embeddingHash" = ${items[i].hash}
        WHERE id = ${items[i].id}`;
      written += 1;
    }
    return written;
  } catch (err) {
    console.error("[embeddings] embedDeals gagal:", err instanceof Error ? err.message : err);
    return 0;
  }
}

/** Deals most similar to the given deal (cosine), excluding itself and expired deals. */
export async function similarDeals(dealId: string, k = 6): Promise<SimilarHit[]> {
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string; sim: number }>>`
      SELECT b.id, (1 - (b.embedding <=> a.embedding))::float AS sim
      FROM "Deal" a, "Deal" b
      WHERE a.id = ${dealId}
        AND a.embedding IS NOT NULL
        AND b.id <> a.id
        AND b.embedding IS NOT NULL
        AND b."verificationStatus" <> 'EXPIRED'
      ORDER BY b.embedding <=> a.embedding
      LIMIT ${k}`;
    return rows.map((r) => ({ dealId: r.id, similarity: Number(r.sim) }));
  } catch (err) {
    console.error("[embeddings] similarDeals gagal:", err instanceof Error ? err.message : err);
    return [];
  }
}

/** Semantic text search over deals. Returns [] when AI or pgvector is unavailable. */
export async function searchByText(q: string, k = 10): Promise<SimilarHit[]> {
  const query = q.trim();
  if (!query || !hasGatewayCredentials()) return [];
  try {
    const { embedding } = await embed({ model: embeddingModelId(), value: query });
    const rows = await prisma.$queryRaw<Array<{ id: string; sim: number }>>`
      SELECT id, (1 - (embedding <=> ${toVectorLiteral(embedding)}::vector))::float AS sim
      FROM "Deal"
      WHERE embedding IS NOT NULL AND "verificationStatus" <> 'EXPIRED'
      ORDER BY embedding <=> ${toVectorLiteral(embedding)}::vector
      LIMIT ${k}`;
    return rows.map((r) => ({ dealId: r.id, similarity: Number(r.sim) }));
  } catch (err) {
    console.error("[embeddings] searchByText gagal:", err instanceof Error ? err.message : err);
    return [];
  }
}

/** Deals closest to the centroid of the liked deals' embeddings. */
export async function centroidSimilarity(
  likedIds: string[],
  k = 30,
  excludeIds: string[] = [],
): Promise<SimilarHit[]> {
  if (likedIds.length === 0) return [];
  try {
    const exclude = [...new Set([...likedIds, ...excludeIds])];
    const rows = await prisma.$queryRaw<Array<{ id: string; sim: number }>>`
      WITH c AS (
        SELECT AVG(embedding) AS v FROM "Deal"
        WHERE id = ANY(${likedIds}::text[]) AND embedding IS NOT NULL
      )
      SELECT d.id, (1 - (d.embedding <=> c.v))::float AS sim
      FROM "Deal" d, c
      WHERE c.v IS NOT NULL
        AND d.embedding IS NOT NULL
        AND NOT (d.id = ANY(${exclude}::text[]))
        AND d."verificationStatus" <> 'EXPIRED'
      ORDER BY d.embedding <=> c.v
      LIMIT ${k}`;
    return rows.map((r) => ({ dealId: r.id, similarity: Number(r.sim) }));
  } catch (err) {
    console.error("[embeddings] centroidSimilarity gagal:", err instanceof Error ? err.message : err);
    return [];
  }
}
