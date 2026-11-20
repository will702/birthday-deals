"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";
import { buttonClasses } from "./Button";

export const Dialog: typeof DialogPrimitive.Root = DialogPrimitive.Root;
export const DialogPortal: typeof DialogPrimitive.Portal = DialogPrimitive.Portal;

export function DialogTrigger(props: DialogPrimitive.Trigger.Props): React.ReactElement {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

export function DialogClose(props: DialogPrimitive.Close.Props): React.ReactElement {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

export function DialogBackdrop({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props): React.ReactElement {
  return (
    <DialogPrimitive.Backdrop
      className={cn(
        "fixed inset-0 z-50 bg-ink/55 backdrop-blur-xs transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0",
        className,
      )}
      data-slot="dialog-backdrop"
      {...props}
    />
  );
}

export function DialogPopup({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
}): React.ReactElement {
  return (
    <DialogPortal>
      <DialogBackdrop />
      <DialogPrimitive.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <DialogPrimitive.Popup
          className={cn(
            "relative flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-hairline bg-surface text-ink shadow-[0_24px_80px_-16px_rgb(17_19_23/0.32)] outline-none transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:scale-96 data-ending-style:opacity-0 data-starting-style:scale-96 data-starting-style:opacity-0 motion-reduce:transition-opacity",
            className,
          )}
          data-slot="dialog-popup"
          {...props}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              aria-label="Tutup dialog"
              className={buttonClasses(
                "ghost",
                "icon",
                "absolute right-3 top-3 z-10 h-8 w-8 rounded-full bg-surface/90 border border-hairline",
              )}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPortal>
  );
}

export function DialogHeader({
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

export function DialogTitle({
  className,
  ...props
}: DialogPrimitive.Title.Props): React.ReactElement {
  return (
    <DialogPrimitive.Title
      className={cn("font-display text-lg font-bold text-ink leading-tight", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props): React.ReactElement {
  return (
    <DialogPrimitive.Description
      className={cn("text-xs text-ink-2", className)}
      {...props}
    />
  );
}

export function DialogBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div className={cn("flex-1 overflow-y-auto p-5", className)} {...props} />
  );
}
