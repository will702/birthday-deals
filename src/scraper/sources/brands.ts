import type { DealCategory } from "../types";

/**
 * Official brand pages for the extended brand adapter.
 * Every URL here was checked to exist and to mention a birthday benefit (ulang tahun / birthday)
 * in its content (plain fetch or Firecrawl). Add a page only after verifying it.
 *
 * Optional `selectors` enable a deterministic cheerio parse; without them the page text goes to
 * the LLM extractor (evidence quote must be a substring of the fetched text).
 */
export interface BrandSource {
  brandName: string;
  url: string;
  category?: DealCategory;
  /** Locations text for deals from this page. */
  locations?: string;
  selectors?: {
    /** One match per promo block. */
    container: string;
    title?: string;
    body?: string;
  };
}

export const BRAND_SOURCES: BrandSource[] = [
  {
    brandName: "Starbucks Indonesia",
    url: "https://www.starbucks.co.id/card",
    category: "Drink & Cafe",
    locations: "Seluruh store Starbucks Indonesia",
  },
  {
    brandName: "Fore Coffee",
    url: "https://fore.coffee/id/term-and-condition-id/",
    category: "Drink & Cafe",
    locations: "Seluruh outlet Fore Coffee",
  },
  {
    brandName: "CGV Indonesia",
    url: "https://www.cgv.id/membership/benefit",
    category: "Cinema & Entertainment",
    locations: "Seluruh bioskop CGV Indonesia",
  },
  {
    brandName: "The Body Shop Indonesia",
    url: "https://www.thebodyshop.co.id/love-your-body-club/birthday-voucher",
    category: "Beauty & Retail",
    locations: "Online dan toko The Body Shop Indonesia",
  },
  {
    brandName: "Bakmi GM",
    url: "https://www.bakmigm.com/birthday-reward",
    category: "F&B",
    locations: "Seluruh outlet Bakmi GM",
  },
  {
    brandName: "Bakmi GM",
    url: "https://www.bakmigm.com/wmembership",
    category: "F&B",
    locations: "Seluruh outlet Bakmi GM",
  },
];

/**
 * Brands requested but with NO verifiable official birthday page found (their promos live in
 * apps or social posts): Kopi Kenangan, Janji Jiwa, Chatime, Cinema XXI, Sociolla, HokBen,
 * Pizza Hut ID, Domino's ID, Solaria, Marugame Udon ID, Haagen-Dazs ID, Baskin Robbins ID.
 * They are covered through the social-public adapter instead.
 */
