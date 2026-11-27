/** Public social profiles/queries for the social-public adapter (public pages only, no login). */
export interface SocialHandle {
  brandName: string;
  platform: "instagram" | "tiktok";
  url: string;
}

export const SOCIAL_PUBLIC_HANDLES: SocialHandle[] = [
  { brandName: "Chatime Indonesia", platform: "instagram", url: "https://www.instagram.com/chatimeindo/" },
  { brandName: "Baskin Robbins Indonesia", platform: "instagram", url: "https://www.instagram.com/baskinrobbinsid/" },
  { brandName: "Häagen-Dazs Indonesia", platform: "instagram", url: "https://www.instagram.com/haagendazs.id/" },
];

export const SOCIAL_PUBLIC_QUERIES = [
  "site:instagram.com promo ulang tahun birthday treat gratis",
  "site:tiktok.com birthday treat gratis ulang tahun member",
];
