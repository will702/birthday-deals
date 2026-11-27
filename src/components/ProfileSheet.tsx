"use client";

import { useState } from "react";
import Link from "next/link";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonClasses } from "@/components/ui/Button";
import { FieldHint, FieldLabel } from "@/components/ui/Field";
import { SelectMenu } from "@/components/ui/SelectMenu";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/Sheet";
import { Switch } from "@/components/ui/Switch";
import { authClient } from "@/lib/auth-client";
import { KNOWN_CITIES } from "@/lib/cities";
import { getCategoryMeta } from "@/lib/deal-types";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const CATEGORIES = ["F&B", "Drink & Cafe", "Cinema & Entertainment", "Beauty & Retail", "Other"];

const NONE = "none";
const DAY_OPTIONS = [
  { value: NONE, label: "Tanggal" },
  ...Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: `Tgl ${i + 1}` })),
];
const MONTH_OPTIONS = [
  { value: NONE, label: "Bulan" },
  ...MONTHS.map((m, i) => ({ value: String(i), label: m })),
];
const CITY_OPTIONS = [
  { value: NONE, label: "Belum dipilih" },
  ...KNOWN_CITIES.map((c) => ({ value: c, label: c })),
];

interface ProfileState {
  day: string;
  month: string;
  city: string;
  categories: string[];
  appOk: boolean;
}

const EMPTY: ProfileState = { day: NONE, month: NONE, city: NONE, categories: [], appOk: true };

export function ProfileSheet() {
  const { data: session } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ProfileState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  function loadProfile() {
    setLoading(true);
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            profile?: {
              birthdayDay: number | null;
              birthdayMonth: number | null;
              city: string | null;
              preferredCategories: string[];
              appOk: boolean;
            };
          } | null,
        ) => {
          const p = data?.profile;
          if (!p) return;
          setState({
            day: p.birthdayDay ? String(p.birthdayDay) : NONE,
            month: p.birthdayMonth !== null ? String(p.birthdayMonth) : NONE,
            city: p.city ?? NONE,
            categories: p.preferredCategories,
            appOk: p.appOk,
          });
        },
      )
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) loadProfile();
  }

  function toggleCategory(cat: string) {
    setState((s) => ({
      ...s,
      categories: s.categories.includes(cat)
        ? s.categories.filter((c) => c !== cat)
        : [...s.categories, cat],
    }));
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      birthdayDay: state.day === NONE ? null : Number(state.day),
      birthdayMonth: state.month === NONE ? null : Number(state.month),
      city: state.city === NONE ? null : state.city,
      preferredCategories: state.categories,
      appOk: state.appOk,
    };
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(String(res.status));
      window.dispatchEvent(new CustomEvent("ultahid:profile-updated", { detail: payload }));
      toast.success("Profil disimpan.");
      setOpen(false);
    } catch {
      toast.error("Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await authClient.signOut();
    toast.success("Kamu sudah keluar.");
    setOpen(false);
    window.location.reload();
  }

  const user = session?.user;

  return (
    <>
      {!user && (
        <Link
          href="/masuk"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-ink-2 hover:text-ink hover:bg-subtle/70 pressable focus-ring whitespace-nowrap"
        >
          Masuk
        </Link>
      )}
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger
          aria-label={user ? `Profil ${user.name}` : "Buka profil"}
          className={buttonClasses("outline", "icon", "h-9 w-9 rounded-xl border-hairline")}
        >
          {user ? (
            <span className="font-display text-xs font-extrabold text-accent">
              {(user.name || user.email).slice(0, 1).toUpperCase()}
            </span>
          ) : (
            <UserRound className="h-4 w-4" aria-hidden="true" />
          )}
        </SheetTrigger>

        <SheetPopup side="right" className="max-w-sm">
          <SheetHeader>
            <SheetTitle>Profil &amp; Preferensi</SheetTitle>
            <SheetDescription>
              Dipakai untuk rekomendasi &quot;Untukmu&quot;. Tersimpan di perangkat ini
              {user ? " dan akunmu." : ", masuk untuk membawanya ke perangkat lain."}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className={cn("space-y-5", loading && "opacity-60")}>
            <div className="space-y-1.5">
              <FieldLabel>Tanggal ulang tahun</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <SelectMenu
                  aria-label="Tanggal lahir"
                  value={state.day}
                  onValueChange={(v) => setState((s) => ({ ...s, day: v }))}
                  options={DAY_OPTIONS}
                />
                <SelectMenu
                  aria-label="Bulan lahir"
                  value={state.month}
                  onValueChange={(v) => setState((s) => ({ ...s, month: v }))}
                  options={MONTH_OPTIONS}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <FieldLabel>Kota</FieldLabel>
              <SelectMenu
                aria-label="Kota"
                value={state.city}
                onValueChange={(v) => setState((s) => ({ ...s, city: v }))}
                options={CITY_OPTIONS}
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel>Kategori favorit</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const active = state.categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleCategory(cat)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold pressable focus-ring cursor-pointer",
                        active
                          ? "border-accent bg-accent-soft text-accent-hover"
                          : "border-line-strong bg-surface text-ink-2 hover:bg-subtle/70",
                      )}
                    >
                      {getCategoryMeta(cat).shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-2xl border border-hairline bg-canvas p-3.5">
              <div className="space-y-0.5">
                <FieldLabel htmlFor="profile-app-ok">Mau daftar aplikasi member</FieldLabel>
                <FieldHint>Matikan jika kamu hanya mau promo langsung klaim di outlet.</FieldHint>
              </div>
              <Switch
                id="profile-app-ok"
                checked={state.appOk}
                onCheckedChange={(checked) => setState((s) => ({ ...s, appOk: checked }))}
              />
            </div>

            <div className="border-t border-hairline pt-4">
              {user ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{user.name}</div>
                    <div className="truncate text-xs text-ink-muted">{user.email}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    Keluar
                  </Button>
                </div>
              ) : (
                <SheetClose
                  render={<Link href="/masuk" className={buttonClasses("outline", "md", "w-full")} />}
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Masuk / Daftar
                </SheetClose>
              )}
            </div>
          </SheetBody>

          <SheetFooter>
            <SheetClose className={buttonClasses("ghost", "md")}>Batal</SheetClose>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? "Menyimpan…" : "Simpan profil"}
            </Button>
          </SheetFooter>
        </SheetPopup>
      </Sheet>
    </>
  );
}
