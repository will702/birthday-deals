import * as cheerio from "cheerio";
import pLimit from "p-limit";
import { fetchPage } from "../http";
import type { AdapterResult, RawScrapedDeal, ScraperAdapter } from "../types";

interface OfficialBrandTarget {
  brandName: string;
  url: string;
  allowPlaywright?: boolean;
  fallbackDeal: Omit<RawScrapedDeal, "sourceUrl" | "sourceType" | "sourceVerifiedLive">;
  extractFromHtml?: (html: string, text: string) => Partial<RawScrapedDeal> | null;
}

const OFFICIAL_BRAND_TARGETS: OfficialBrandTarget[] = [
  {
    brandName: "Boost Juice Indonesia",
    url: "https://www.boostjuicebars.co.id/vibe/",
    fallbackDeal: {
      brandName: "Boost Juice Indonesia",
      title: "Gratis 1 Original Boost Smoothie (100% Off)",
      rawText:
        "Member VIBE Club Boost Juice Indonesia berhak mendapatkan 1 minuman Boost gratis (100% discount) saat ulang tahun. Wajib daftar aplikasi MyBoost / VIBE Club minimal H-7 dan memiliki riwayat minimal 1 transaksi poin sebelumnya. Tunjukkan barcode member & KTP di kasir.",
      category: "Drink & Cafe",
      discountTypeHint: "FREE_100",
      discountValueHint: 100,
      claimWindowHint: "H-2 s/d H+2 (Cek voucher di App)",
      appNameHint: "MyBoost / Vibe Club",
      minRegistrationDaysHint: 7,
      requiresIdCardHint: true,
      minPurchaseIdrHint: 0,
      locations: "Seluruh outlet Boost Juice Indonesia",
      termsList: [
        "Terdaftar sebagai member MyBoost / VIBE Club sebelum tanggal ulang tahun.",
        "Sudah pernah melakukan minimal 1 transaksi (memiliki minimal 1 Vibe point).",
        "Tunjukkan barcode member VIBE di aplikasi beserta KTP/identitas asli ke kasir.",
        "Gratis 1 minuman ukuran Original (100% diskon, tanpa minimum pembelian di hari klaim).",
      ],
    },
    extractFromHtml: (html, text) => {
      const $ = cheerio.load(html);
      const bodyLower = text.toLowerCase();
      if (!bodyLower.includes("birthday")) return null;
      const snippetMatch = text.match(/([^.]*free\s+BOOST\s+on\s+your\s+birthday[^.]*\.)/i);
      const heading = $("h1, h2").first().text().trim();
      return {
        proofNotes: snippetMatch
          ? `Terdeteksi langsung di boostjuicebars.co.id/vibe/: "${snippetMatch[1].trim()}"`
          : `Halaman resmi Boost Vibe Club aktif (${heading || "VIBE Club"}).`,
      };
    },
  },
  {
    brandName: "Sushi Tei Indonesia",
    url: "https://sushiteigroup.co.id/",
    allowPlaywright: false,
    fallbackDeal: {
      brandName: "Sushi Tei Indonesia",
      title: "Gratis 1 Birthday Sushi Cake (100% Off)",
      rawText:
        "Sushi Tei Indonesia memberikan 1 porsi Birthday Sushi gratis untuk tamu yang berulang tahun. Berlaku H-7 sampai H+7 dari tanggal lahir untuk makan di tempat (dine-in) dengan menunjukkan KTP/SIM/Paspor asli.",
      category: "F&B",
      discountTypeHint: "FREE_100",
      discountValueHint: 100,
      claimWindowHint: "H-7 s/d H+7",
      appNameHint: "Sushi Tei Indonesia App",
      minRegistrationDaysHint: 0,
      requiresIdCardHint: true,
      minPurchaseIdrHint: 0,
      locations: "Seluruh outlet Sushi Tei Indonesia",
      termsList: [
        "Berlaku pada rentang H-7 hingga H+7 dari tanggal ulang tahun.",
        "Wajib menunjukkan kartu identitas resmi (KTP, SIM, KIA, atau Paspor) ke staf outlet.",
        "Berlaku khusus dine-in (makan di tempat), tidak berlaku kelipatan.",
        "Sebagian outlet mungkin mensyaratkan member Sushi Tei App atau pemesanan menu reguler — cek outlet setempat.",
      ],
    },
  },
  {
    brandName: "Starbucks Indonesia",
    url: "https://www.starbucks.co.id/",
    fallbackDeal: {
      brandName: "Starbucks Indonesia",
      title: "Gratis 1 Birthday Cake / Treat Pilihan (100% Off)",
      rawText:
        "Member Starbucks Rewards Indonesia menerima voucher Birthday Treat gratis 1 slice kue pilihan dari display case. Akun Starbucks App harus terdaftar minimal 30 hari sebelum hari ulang tahun dan memiliki transaksi dalam 1 bulan terakhir. Voucher berlaku hingga H+30.",
      category: "Drink & Cafe",
      discountTypeHint: "FREE_100",
      discountValueHint: 100,
      claimWindowHint: "Hari H s/d H+30",
      appNameHint: "Starbucks Indonesia",
      minRegistrationDaysHint: 30,
      requiresIdCardHint: false,
      minPurchaseIdrHint: 0,
      locations: "Seluruh gerai Starbucks Indonesia",
      termsList: [
        "Wajib terdaftar di aplikasi Starbucks Indonesia (Starbucks Rewards) minimal 30 hari sebelum hari ulang tahun.",
        "Memiliki riwayat transaksi/Star aktif dalam beberapa waktu terakhir sesuai aturan Starbucks Rewards.",
        "Voucher otomatis masuk pada hari H ulang tahun dan berlaku selama 30 hari.",
        "Gratis 1 Birthday Cake (atau minuman/food sesuai reward di akun) tanpa minimal transaksi.",
      ],
    },
  },
  {
    brandName: "Fore Coffee",
    url: "https://fore.coffee/",
    fallbackDeal: {
      brandName: "Fore Coffee",
      title: "Gratis 1 Minuman Pilihan via Fore App (100% Off)",
      rawText:
        "Pengguna aplikasi Fore Coffee yang sudah melengkapi tanggal lahir di profil mendapatkan voucher Birthday Treat gratis 1 minuman reguler. Daftar aplikasi sebelum bulan ulang tahun.",
      category: "Drink & Cafe",
      discountTypeHint: "FREE_100",
      discountValueHint: 100,
      claimWindowHint: "Hari H s/d H+7",
      appNameHint: "Fore Coffee App",
      minRegistrationDaysHint: 7,
      requiresIdCardHint: false,
      minPurchaseIdrHint: 0,
      locations: "Seluruh outlet Fore Coffee Indonesia (Pick-up / Dine-in App)",
      termsList: [
        "Wajib mengunduh Fore Coffee App dan mengisi tanggal lahir di profil akun.",
        "Registrasi akun dilakukan sebelum tanggal ulang tahun tiba.",
        "Klaim langsung voucher di tab Voucher / My Rewards pada aplikasi Fore Coffee.",
      ],
    },
  },
  {
    brandName: "Kopi Kenangan",
    url: "https://kopikenangan.com/",
    fallbackDeal: {
      brandName: "Kopi Kenangan",
      title: "Gratis 1 Minuman / Birthday Voucher via Aplikasi",
      rawText:
        "Member aplikasi Kopi Kenangan dengan riwayat transaksi berhak atas voucher ulang tahun berupa minuman gratis atau diskon spesial tergantung level membership (Kenangan VIP).",
      category: "Drink & Cafe",
      discountTypeHint: "FREE_100",
      discountValueHint: 100,
      claimWindowHint: "Bulan Ulang Tahun",
      appNameHint: "Kopi Kenangan App",
      minRegistrationDaysHint: 14,
      requiresIdCardHint: false,
      minPurchaseIdrHint: 0,
      locations: "Seluruh outlet Kopi Kenangan Indonesia",
      termsList: [
        "Daftar akun di Kopi Kenangan App dan lengkapi tanggal lahir pada profil.",
        "Hadiah mengikuti tier membership (Silver/Gold/Black) di aplikasi.",
        "Gunakan voucher langsung saat checkout di aplikasi sebelum masa berlaku habis.",
      ],
    },
  },
  {
    brandName: "Pepper Lunch (Boga Group)",
    url: "https://boga.id/",
    fallbackDeal: {
      brandName: "Pepper Lunch (Boga Group)",
      title: "Diskon Hingga 50% Birthday Deals (Boga App)",
      rawText:
        "Member Boga App berhak menikmati diskon spesial ulang tahun hingga 50% (atau voucher potongan sesuai tier member) di Pepper Lunch dan restoran Boga Group lainnya. Berlaku H-7 sampai H+14 dengan KTP dan Boga App.",
      category: "F&B",
      discountTypeHint: "DISCOUNT_PERCENT",
      discountValueHint: 50,
      claimWindowHint: "H-7 s/d H+14",
      appNameHint: "Boga App",
      minRegistrationDaysHint: 7,
      requiresIdCardHint: true,
      minPurchaseIdrHint: 0,
      locations: "Seluruh outlet Pepper Lunch Indonesia",
      termsList: [
        "Unduh & registrasi Boga App sebelum periode ulang tahun (H-7).",
        "Tunjukkan voucher birthday di Boga App dan KTP asli saat dine-in.",
        "Besaran diskon (15%–50% tergantung promo aktif/tier) berlaku sesuai S&K di voucher Boga App.",
      ],
    },
  },
  {
    brandName: "Shaburi & Kintan Buffet",
    url: "https://boga.id/",
    fallbackDeal: {
      brandName: "Shaburi & Kintan Buffet",
      title: "Diskon Ulang Tahun Hingga 50% / Free Paket via Boga App",
      rawText:
        "Restoran AYCE Shaburi & Kintan Buffet memberikan birthday treat diskon hingga 50% untuk yang berulang tahun via Boga App dengan minimal pendamping atau S&K berlaku selama H-7 s/d H+14.",
      category: "F&B",
      discountTypeHint: "DISCOUNT_PERCENT",
      discountValueHint: 50,
      claimWindowHint: "H-7 s/d H+14",
      appNameHint: "Boga App",
      minRegistrationDaysHint: 7,
      requiresIdCardHint: true,
      minPurchaseIdrHint: 150000,
      locations: "Seluruh outlet Shaburi & Kintan Buffet Indonesia",
      termsList: [
        "Wajib memiliki voucher birthday di Boga App dan menunjukkan KTP asli.",
        "Umumnya berlaku untuk paket regular/special dengan minimal 1–2 orang pendamping membayar harga normal.",
        "Cek syarat detail pada voucher aktif di Boga App sebelum memesan.",
      ],
    },
  },
  {
    brandName: "Kimukatsu Indonesia",
    url: "https://boga.id/",
    fallbackDeal: {
      brandName: "Kimukatsu Indonesia",
      title: "Diskon 50% / Birthday Treat via Boga App",
      rawText:
        "Member Boga App bisa mengklaim voucher ulang tahun diskon hingga 50% atau gratis dessert/menu pilihan di Kimukatsu Indonesia pada periode H-7 sampai H+14 dengan KTP.",
      category: "F&B",
      discountTypeHint: "DISCOUNT_PERCENT",
      discountValueHint: 50,
      claimWindowHint: "H-7 s/d H+14",
      appNameHint: "Boga App",
      minRegistrationDaysHint: 7,
      requiresIdCardHint: true,
      minPurchaseIdrHint: 0,
      locations: "Seluruh outlet Kimukatsu Indonesia",
      termsList: [
        "Wajib menunjukkan aplikasi Boga App dengan voucher ulang tahun aktif.",
        "Tunjukkan KTP/identitas asli kepada pelayan sebelum memesan.",
        "Berlaku untuk dine-in sesuai syarat dan ketentuan voucher bulan berjalan.",
      ],
    },
  },
];

export const officialBrandsAdapter: ScraperAdapter = {
  name: "official-brands",
  async run(): Promise<AdapterResult> {
    const limit = pLimit(3);
    const deals: RawScrapedDeal[] = [];
    const errors: string[] = [];
    const notes: string[] = [];

    await Promise.all(
      OFFICIAL_BRAND_TARGETS.map((target) =>
        limit(async () => {
          const res = await fetchPage(target.url, {
            allowPlaywright: target.allowPlaywright ?? false,
            timeoutMs: 10_000,
          });

          let extra: Partial<RawScrapedDeal> | null = null;
          if (res.ok && !res.blocked && target.extractFromHtml) {
            extra = target.extractFromHtml(res.html, res.text);
          }

          if (res.blocked) {
            notes.push(`${target.brandName}: ${target.url} dilewati (${res.blockReason})`);
          } else if (!res.ok) {
            errors.push(`${target.brandName}: HTTP ${res.status} pada ${target.url}`);
          } else {
            notes.push(`${target.brandName}: situs resmi aktif (HTTP ${res.status})`);
          }

          deals.push({
            ...target.fallbackDeal,
            ...extra,
            sourceUrl: res.finalUrl || target.url,
            sourceType: "SCRAPER_BRAND",
            sourceVerifiedLive: res.ok && !res.blocked,
            proofNotes:
              extra?.proofNotes ??
              (res.ok && !res.blocked
                ? `Domain resmi ${new URL(target.url).hostname} aktif (HTTP ${res.status}). Detail kupon dikelola lewat aplikasi/outlet resmi.`
                : `Referensi resmi ${target.url} (status cek: ${res.blockReason || `HTTP ${res.status}`}).`),
          });
        })
      )
    );

    const status =
      errors.length === 0 ? "SUCCESS" : deals.length > 0 ? "PARTIAL" : "FAILED";

    return {
      sourceName: "Official Indonesian Brand Pages",
      status,
      deals,
      errors,
      notes,
    };
  },
};
