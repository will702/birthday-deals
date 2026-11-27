"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FieldHint, FieldLabel, Input } from "@/components/ui/Field";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type Mode = "masuk" | "daftar";

export function MasukForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("masuk");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result =
        mode === "masuk"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({
              email,
              password,
              name: name.trim() || email.split("@")[0],
            });
      if (result.error) {
        setError(
          result.error.message ||
            (mode === "masuk" ? "Email atau kata sandi salah." : "Pendaftaran gagal."),
        );
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-3xl border border-hairline bg-surface p-6 sm:p-8 shadow-[0_2px_10px_-4px_rgb(17_19_23/0.06)]">
      <h1 className="font-display text-display-md text-ink">
        {mode === "masuk" ? "Masuk ke UltahID" : "Buat akun UltahID"}
      </h1>
      <p className="mt-1.5 text-sm text-ink-2">
        Simpan promo favorit dan preferensimu, lalu akses dari perangkat mana pun. Data yang sudah
        kamu kumpulkan sebagai tamu ikut terbawa.
      </p>

      <div
        role="tablist"
        aria-label="Pilih masuk atau daftar"
        className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-subtle p-1"
      >
        {(["masuk", "daftar"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold pressable focus-ring cursor-pointer",
              mode === m ? "bg-surface text-ink shadow-xs" : "text-ink-muted hover:text-ink",
            )}
          >
            {m === "masuk" ? "Masuk" : "Daftar"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {mode === "daftar" && (
          <div className="space-y-1.5">
            <FieldLabel htmlFor="masuk-name">Nama</FieldLabel>
            <Input
              id="masuk-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama panggilan"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <FieldLabel htmlFor="masuk-email" required>
            Email
          </FieldLabel>
          <Input
            id="masuk-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kamu@email.com"
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="masuk-password" required>
            Kata sandi
          </FieldLabel>
          <Input
            id="masuk-password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "masuk" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "daftar" && <FieldHint>Minimal 8 karakter.</FieldHint>}
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-danger-line bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger-ink"
          >
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Memproses…" : mode === "masuk" ? "Masuk" : "Daftar"}
        </Button>
      </form>
    </section>
  );
}
