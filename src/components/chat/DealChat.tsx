"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { CalendarDays, Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getCategoryMeta } from "@/lib/deal-types";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Promo ultah gratis di Jakarta",
  "Promo kopi tanpa minimum belanja",
  "Rekomendasi promo buat aku",
  "Susun rencana ultah tanggal 15 Agustus",
];

interface ChatDeal {
  slug: string;
  brand: string;
  title: string;
  category: string;
  discount: string;
  claimWindow: string;
}

interface ToolPartLike {
  type: string;
  state?: string;
  output?: unknown;
}

function isToolPart(part: { type: string }): part is ToolPartLike {
  return part.type.startsWith("tool-");
}

function extractDeals(output: unknown): ChatDeal[] {
  if (!output || typeof output !== "object") return [];
  const deals = (output as { deals?: unknown }).deals;
  if (!Array.isArray(deals)) return [];
  return deals.filter(
    (d): d is ChatDeal => Boolean(d) && typeof d === "object" && typeof (d as ChatDeal).slug === "string",
  );
}

function MiniDealCard({ deal }: { deal: ChatDeal }) {
  const meta = getCategoryMeta(deal.category);
  return (
    <Link
      href={`/deals/${deal.slug}`}
      className="relative block overflow-hidden rounded-xl border border-hairline bg-surface pl-3.5 pr-3 py-2.5 hover:border-line-strong pressable focus-ring"
    >
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", meta.barClass)} />
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-bold text-ink">{deal.brand}</span>
        <Badge tone="clay" numeric>{deal.discount}</Badge>
      </span>
      <span className="mt-0.5 block truncate text-xs text-ink-2">{deal.title}</span>
      <span className="mt-1 block text-[11px] font-medium text-ink-muted">{deal.claimWindow}</span>
    </Link>
  );
}

/** Renders assistant text, turning [label](/deals/slug) links into in-app links and **bold**. */
function RichText({ text }: { text: string }) {
  const tokens = text.split(/(\[[^\]]+\]\(\/(?:deals\/[a-z0-9-]+|rencana)\)|\*\*[^*]+\*\*)/g);
  return (
    <>
      {tokens.map((tok, i) => {
        const link = tok.match(/^\[([^\]]+)\]\((\/[^)]+)\)$/);
        if (link) {
          return (
            <Link key={i} href={link[2]} className="font-semibold text-accent underline underline-offset-2">
              {link[1]}
            </Link>
          );
        }
        const bold = tok.match(/^\*\*([^*]+)\*\*$/);
        if (bold) return <strong key={i}>{bold[1]}</strong>;
        return <Fragment key={i}>{tok}</Fragment>;
      })}
    </>
  );
}

export function DealChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function send(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    sendMessage({ text: value });
    setInput("");
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka asisten Tanya UltahID"
          className="fixed bottom-4 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white shadow-lg pressable focus-ring cursor-pointer"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Tanya UltahID</span>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Tanya UltahID"
          className="fixed inset-x-3 bottom-3 z-50 flex max-h-[min(36rem,calc(100dvh-5rem))] flex-col overflow-hidden rounded-3xl border border-hairline bg-canvas shadow-2xl sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[24rem]"
        >
          <header className="flex items-center justify-between gap-2 border-b border-hairline bg-surface px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-accent-hover">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold leading-tight text-ink">Tanya UltahID</h2>
                <p className="text-[11px] text-ink-muted">Asisten promo ulang tahun</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" aria-label="Tutup asisten" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-ink-2">
                  Halo! Tanyakan promo ulang tahun yang cocok buat kamu. Contoh:
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-full border border-line-strong bg-surface px-3 py-1.5 text-left text-xs font-semibold text-ink-2 hover:text-ink hover:border-ink-muted/55 pressable focus-ring cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={cn("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}>
                {m.parts.map((part, i) => {
                  if (part.type === "text") {
                    if (!part.text) return null;
                    return (
                      <p
                        key={i}
                        className={cn(
                          "max-w-[90%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                          m.role === "user" ? "bg-ink text-white" : "bg-surface text-ink border border-hairline",
                        )}
                      >
                        {m.role === "user" ? part.text : <RichText text={part.text} />}
                      </p>
                    );
                  }
                  if (isToolPart(part)) {
                    if (part.state === "output-error") return null;
                    if (part.state !== "output-available") {
                      return (
                        <p key={i} className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                          Mencari promo...
                        </p>
                      );
                    }
                    const deals = extractDeals(part.output);
                    if (part.type === "tool-planBirthday") {
                      return (
                        <Link
                          key={i}
                          href="/rencana"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-line-strong pressable focus-ring"
                        >
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                          Buka Rencana Ulang Tahun lengkap
                        </Link>
                      );
                    }
                    if (deals.length === 0) return null;
                    return (
                      <div key={i} className="grid w-full gap-2">
                        {deals.map((d) => (
                          <MiniDealCard key={d.slug} deal={d} />
                        ))}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ))}

            {status === "submitted" && (
              <p className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                Berpikir...
              </p>
            )}

            {error && (
              <p role="alert" className="rounded-xl border border-danger-line bg-danger-bg px-3 py-2 text-xs text-danger-ink">
                Asisten sedang tidak tersedia atau terlalu sibuk. Coba lagi sebentar lagi.
              </p>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-hairline bg-surface px-3 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya soal promo ultah..."
              aria-label="Pesan untuk asisten"
              maxLength={500}
              className="field min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm"
            />
            {busy ? (
              <Button type="button" variant="outline" size="icon" aria-label="Hentikan" onClick={() => stop()}>
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button type="submit" size="icon" aria-label="Kirim pesan" disabled={!input.trim()}>
                <Send className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </form>
        </section>
      )}
    </>
  );
}
