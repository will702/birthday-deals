import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Toaster } from "@/components/ui/Toaster";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UltahID — Direktori Promo Ulang Tahun Indonesia Terverifikasi",
  description:
    "Katalog promo ulang tahun di Indonesia (Boost Juice 100% gratis, Sushi Tei, Starbucks, diskon 50%) yang dikumpulkan scraper otomatis dan diverifikasi komunitas dengan bukti asli.",
};

export const viewport: Viewport = {
  themeColor: "#F6F6F3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${bricolage.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        <Suspense fallback={<div className="h-16 bg-canvas" />}>
          <SiteHeader />
        </Suspense>
        <main className="flex-1 w-full">{children}</main>
        <SiteFooter />
        <Toaster />
      </body>
    </html>
  );
}
