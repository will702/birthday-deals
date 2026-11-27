"use client";

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";
import { buttonClasses } from "./Button";

export const Sheet: typeof SheetPrimitive.Root = SheetPrimitive.Root;
export const SheetPortal: typeof SheetPrimitive.Portal = SheetPrimitive.Portal;

export function SheetTrigger(props: SheetPrimitive.Trigger.Props): React.ReactElement {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

export function SheetClose(props: SheetPrimitive.Close.Props): React.ReactElement {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

export function SheetBackdrop({
  className,
  ...props
}: SheetPrimitive.Backdrop.Props): React.ReactElement {
  return (
    <SheetPrimitive.Backdrop
      className={cn(
        "fixed inset-0 z-50 bg-ink/45 backdrop-blur-xs transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0",
        className,
      )}
      data-slot="sheet-backdrop"
      {...props}
    />
  );
}

export function SheetPopup({
  className,
  children,
  showCloseButton = true,
  side = "bottom",
  ...props
}: SheetPrimitive.Popup.Props & {
  showCloseButton?: boolean;
  side?: "right" | "left" | "top" | "bottom";
}): React.ReactElement {
  return (
    <SheetPortal>
      <SheetBackdrop />
      <SheetPrimitive.Viewport
        className={cn(
          "fixed inset-0 z-50 grid",
          side === "bottom" && "grid-rows-[1fr_auto] pt-12",
          side === "top" && "grid-rows-[auto_1fr] pb-12",
          side === "left" && "flex justify-start",
          side === "right" && "flex justify-end",
        )}
      >
        <SheetPrimitive.Popup
          className={cn(
            "relative flex max-h-[88dvh] min-h-0 w-full flex-col bg-surface text-ink shadow-[0_-8px_40px_-12px_rgb(17_19_23/0.22)] outline-none transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-opacity",
            side === "bottom" &&
              "row-start-2 rounded-t-3xl border-t border-hairline data-ending-style:translate-y-8 data-starting-style:translate-y-8",
            side === "top" &&
              "rounded-b-3xl border-b border-hairline data-ending-style:-translate-y-8 data-starting-style:-translate-y-8",
            side === "left" &&
              "h-full max-h-none w-[calc(100%-3rem)] max-w-sm border-r border-hairline data-ending-style:-translate-x-8 data-starting-style:-translate-x-8",
            side === "right" &&
              "h-full max-h-none w-[calc(100%-3rem)] max-w-sm border-l border-hairline data-ending-style:translate-x-8 data-starting-style:translate-x-8",
            className,
          )}
          data-slot="sheet-popup"
          {...props}
        >
          {side === "bottom" && (
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-border-strong" aria-hidden="true" />
          )}
          {children}
          {showCloseButton && (
            <SheetPrimitive.Close
              aria-label="Tutup panel"
              className={buttonClasses("ghost", "icon", "absolute right-3 top-3 h-8 w-8 rounded-full")}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </SheetPrimitive.Close>
          )}
        </SheetPrimitive.Popup>
      </SheetPrimitive.Viewport>
    </SheetPortal>
  );
}

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn("flex flex-col gap-1 border-b border-hairline px-5 py-4 pr-12", className)}
      {...props}
    />
  );
}

export function SheetTitle({
  className,
  ...props
}: SheetPrimitive.Title.Props): React.ReactElement {
  return (
    <SheetPrimitive.Title
      className={cn("font-display text-lg font-bold text-ink leading-tight", className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props): React.ReactElement {
  return (
    <SheetPrimitive.Description
      className={cn("text-xs text-ink-2", className)}
      {...props}
    />
  );
}

export function SheetBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn("flex-1 overflow-y-auto px-5 py-4", className)}
      {...props}
    />
  );
}

export function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-t border-hairline bg-canvas/85 px-5 py-3.5",
        className,
      )}
      {...props}
    />
  );
}
