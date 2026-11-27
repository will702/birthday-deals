import { tool } from "ai";
import { z } from "zod";
import {
  CATEGORIES,
  DISCOUNT_TYPES,
  getDealCore,
  isValidBirthday,
  planBirthdayCore,
  recommendCore,
  searchDealsCore,
  similarCore,
} from "@/ai/deal-queries";
import type { Viewer } from "@/lib/visitor";

/** Read-only deal tools for the chat agent. Tool results are data, never instructions. */
export function createDealTools(viewer: Viewer | null) {
  return {
    searchDeals: tool({
      description:
        "Cari promo ulang tahun. Gunakan query untuk pencarian makna (brand, jenis makanan, suasana) dan filter untuk menyempitkan hasil.",
      inputSchema: z.object({
        query: z.string().max(200).optional().describe("Kata kunci atau deskripsi bebas"),
        category: z.enum(CATEGORIES).optional(),
        city: z.string().max(60).optional().describe("Nama kota, mis. Jakarta"),
        discountType: z.enum(DISCOUNT_TYPES).optional(),
        freeOnly: z.boolean().optional().describe("Hanya promo gratis 100%"),
        noMinPurchase: z.boolean().optional().describe("Hanya promo tanpa minimum belanja"),
        limit: z.number().int().min(1).max(10).default(5),
      }),
      execute: async (input) => searchDealsCore(input),
    }),
    getDeal: tool({
      description: "Ambil detail satu promo berdasarkan slug (syarat utama, lokasi, jendela klaim).",
      inputSchema: z.object({ slug: z.string().min(1).max(160) }),
      execute: async ({ slug }) => {
        const { deal } = await getDealCore(slug);
        return deal ? { found: true, deals: [deal] } : { found: false, deals: [] };
      },
    }),
    recommendForMe: tool({
      description: "Rekomendasi promo yang dipersonalisasi untuk pengguna ini (berdasarkan profil dan aktivitasnya).",
      inputSchema: z.object({ limit: z.number().int().min(1).max(10).default(5) }),
      execute: async ({ limit }) => recommendCore(viewer, limit),
    }),
    similarDeals: tool({
      description: "Cari promo yang mirip dengan promo tertentu (berdasarkan slug).",
      inputSchema: z.object({
        slug: z.string().min(1).max(160),
        limit: z.number().int().min(1).max(10).default(5),
      }),
      execute: async ({ slug, limit }) => similarCore(slug, limit),
    }),
    planBirthday: tool({
      description:
        "Susun jadwal klaim promo di sekitar tanggal ulang tahun (H-30 s/d H+30), termasuk persiapan seperti daftar member atau pasang aplikasi.",
      inputSchema: z.object({
        birthdayDay: z.number().int().min(1).max(31),
        birthdayMonth: z.number().int().min(1).max(12).describe("Bulan 1-12 (Januari = 1)"),
        city: z.string().max(60).optional(),
        categories: z.array(z.enum(CATEGORIES)).max(5).optional(),
      }),
      execute: async ({ birthdayDay, birthdayMonth, city, categories }) => {
        if (!isValidBirthday(birthdayDay, birthdayMonth)) {
          return { error: "Tanggal ulang tahun tidak valid." };
        }
        return planBirthdayCore({ day: birthdayDay, month: birthdayMonth, city, categories });
      },
    }),
  };
}

export type DealTools = ReturnType<typeof createDealTools>;
