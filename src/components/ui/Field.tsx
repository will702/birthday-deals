import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

const controlClasses =
  "field w-full rounded-xl border border-line-strong bg-surface text-sm text-ink placeholder:text-ink-muted hover:border-ink-muted/55";

export function FieldLabel({
  children,
  required,
  className,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn("flex items-baseline gap-1 text-xs font-semibold text-ink", className)}
      {...rest}
    >
      {children}
      {required && (
        <span aria-hidden="true" className="text-accent">
          *
        </span>
      )}
    </label>
  );
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-ink-muted">{children}</p>;
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...rest }: InputProps) {
  return <input className={cn(controlClasses, "px-3.5 py-2.5", className)} {...rest} />;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = "", children, ...rest }: SelectProps) {
  return (
    <select
      className={cn(
        controlClasses,
        "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236c727f%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.75rem_center] bg-no-repeat pr-8 pl-3.5 py-2.5",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className = "", ...rest }: TextareaProps) {
  return (
    <textarea
      className={cn(controlClasses, "px-3.5 py-2.5 min-h-20 leading-relaxed", className)}
      {...rest}
    />
  );
}
