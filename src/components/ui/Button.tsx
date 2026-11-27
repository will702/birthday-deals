import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "soft";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-xs hover:bg-accent-hover active:bg-accent-hover",
  secondary: "bg-ink text-white shadow-xs hover:bg-ink/88",
  outline:
    "border border-line-strong bg-surface text-ink shadow-2xs hover:bg-subtle/80 hover:border-ink-muted/45",
  ghost: "text-ink-2 hover:text-ink hover:bg-subtle/80",
  soft: "bg-accent-soft text-accent-hover hover:bg-accent-soft/80",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-xl gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-11 px-5 text-sm rounded-xl gap-2",
  icon: "h-9 w-9 p-0 rounded-xl",
};

/** Class string for styling a Link (or custom element) as a button. */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra = "",
) {
  return cn(
    "inline-flex items-center justify-center font-semibold whitespace-nowrap pressable focus-ring disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
    variantClasses[variant],
    sizeClasses[size],
    extra,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      {...rest}
    />
  );
}
