import { describe, expect, it } from "vitest";
import { isDuplicateDeal } from "../src/scraper/dedupe";

// Real pairs from the 2026-11-27 local scrape run (existing deal vs newly scraped).
const P: [string,string,string|null,string,string,string|null,boolean][] = [
 ["IPPUDO","Promo IPPUDO Birthday Treats Gratis Dessert",null,"Ippudo","Gratis Dessert","FREE_ITEM_WITH_PURCHASE",true],
 ["Loaf Bun","Promo Loaf Bun Birthday Treats Diskon Hingga 50%","DISCOUNT_PERCENT","Loaf Bun","Diskon Hingga 50%","DISCOUNT_PERCENT",true],
 ["Sushi Tei Indonesia","Gratis 1 Birthday Sushi Cake (100% Off)","FREE_100","Sushi Tei","Free Birthday Sushi","FREE_ITEM_WITH_PURCHASE",true],
 ["Cinépolis","Promo Cinépolis Birthday Gift Tiket dan Popcorn","FREE_100","Cinépolis","Tiket dan Popcorn Gratis","FREE_100",true],
 ["Starbucks Indonesia","Gratis 1 Birthday Cake / Treat Pilihan (100% Off)","FREE_100","Starbucks","Free Birthday Cake Slice","FREE_ITEM_WITH_PURCHASE",true],
 ["The Jungle","Promo The Jungle Birthday Treats Gratis Tiket","FREE_100","The Jungle Waterpark","Gratis Tiket Masuk","FREE_100",true],
 ["Marugame Udon","Promo Ulang Tahun Marugame Udon",null,"Marugame Udon","Buy 1 Get 1 Free Udon Ulang Tahun","BOGO",true],
 ["Teazzi","Promo Ulang Tahun Teazzi",null,"Teazzi","Free Es Teh atau Boba Ulang Tahun","FREE_100",true],
 ["Pizza Hut","Promo Pizza Hut Birthday Treats: Birthday Pizza",null,"Pizza Hut","Free Sweet Pizza Ulang Tahun","FREE_ITEM_WITH_PURCHASE",true],
 ["Fore Coffee","Voucher gratis buy 1 get 1 untuk yang ulang tahun","BOGO","Fore Coffee","Buy 1 Get 1 Free Regular Sized Coffee Ulang Tahun","BOGO",true],
 ["Master Squid","Gratis French Fries","FREE_ITEM_WITH_PURCHASE","Master Squid","Promo Master Squid Birthday Treats Gratis French Fries","FREE_ITEM_WITH_PURCHASE",true],
 ["Bakmi GM","Gratis Bakmi Goreng Ayam","FREE_100","Bakmi GM","Gratis E-Voucher Krispi Chips Ulang Tahun","FREE_ITEM_WITH_PURCHASE",false],
 ["Bakmi GM","Gratis Bakmi Goreng Ayam","FREE_ITEM_WITH_PURCHASE","Bakmi GM","Free Iced Mango Yakult atau Snack Crispy","FREE_ITEM_WITH_PURCHASE",false],
 ["The Jungle","Promo The Jungle Birthday Treats Gratis Tiket","FREE_100","The Body Shop Indonesia","Birthday Voucher dari Love Your Body Club","VOUCHER",false],
 ["Chadol Gujeolpan","Diskon 15%","DISCOUNT_PERCENT","Han Guksu","Diskon 15%","DISCOUNT_PERCENT",false],
 ["CGV Indonesia","Gratis 2 Minuman Eksklusif Ulang Tahun","FREE_100","CGV Indonesia","Gratis Tiket Nonton Ulang Tahun","FREE_100",false],
];

describe("dedupe replay of real scrape pairs", () => {
  it.each(P)("%s — %s vs %s — %s", (b1, t1, d1, b2, t2, d2, expected) => {
    expect(isDuplicateDeal({ brandName: b1, title: t1, discountType: d1 }, { brandName: b2, title: t2, discountType: d2 })).toBe(expected);
  });
});
