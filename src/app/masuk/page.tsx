import type { Metadata } from "next";
import { MasukForm } from "@/components/MasukForm";

export const metadata: Metadata = {
  title: "Masuk | UltahID",
  description: "Masuk atau daftar untuk menyimpan promo dan preferensi di semua perangkat.",
};

export default function MasukPage() {
  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-10 sm:py-14">
      <MasukForm />
    </div>
  );
}
