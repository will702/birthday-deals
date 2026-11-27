"use client";

import { useState } from "react";
import { CheckCircle2, ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadDropzoneProps {
  imageUrl: string | null;
  uploading: boolean;
  onFileSelect: (file: File | undefined) => void;
  onRemove: () => void;
  id?: string;
  compact?: boolean;
}

/**
 * Accessible drag-and-drop proof image uploader inspired by diceui/file-upload.
 */
export function FileUploadDropzone({
  imageUrl,
  uploading,
  onFileSelect,
  onRemove,
  id,
  compact = false,
}: FileUploadDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);

  if (imageUrl) {
    return (
      <div className="reveal flex items-center justify-between gap-3 rounded-xl border border-success-line bg-success-bg p-2.5">
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Pratinjau foto bukti promo"
            className="h-14 w-14 shrink-0 rounded-lg border border-success-line/60 bg-surface object-cover"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Foto bukti siap dilampirkan
            </div>
            <p className="mt-0.5 truncate text-[11px] text-ink-2">
              {imageUrl}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Hapus gambar bukti"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-success-line bg-surface text-ink-2 hover:text-danger-ink hover:border-danger-line pressable focus-ring cursor-pointer"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <label
      htmlFor={id}
      data-dragover={dragOver ? "true" : undefined}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onFileSelect(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "group flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong bg-canvas/80 text-center transition-colors hover:border-accent hover:bg-accent-soft/25 data-[dragover=true]:border-accent data-[dragover=true]:bg-accent-soft/45 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
        compact ? "px-3.5 py-2.5 flex-row justify-start" : "px-4 py-6 flex-col",
      )}
    >
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-xl bg-surface border border-hairline text-accent shadow-2xs transition-transform group-hover:scale-105",
          compact ? "h-8 w-8" : "h-10 w-10",
        )}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
        )}
      </span>
      <span className={cn("text-xs", compact ? "text-left" : "text-center")}>
        <span className="block font-semibold text-ink">
          {uploading ? "Mengunggah gambar bukti…" : "Pilih atau tarik foto struk / voucher"}
        </span>
        <span className="mt-0.5 block text-[11px] text-ink-muted">
          JPG, PNG, atau WebP · maks 4MB
        </span>
      </span>
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        disabled={uploading}
        onChange={(e) => onFileSelect(e.target.files?.[0])}
      />
    </label>
  );
}
