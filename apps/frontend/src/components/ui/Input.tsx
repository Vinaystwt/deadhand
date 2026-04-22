import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-text-secondary font-sans">{label}</label>
      )}
      <input
        className={cn(
          "w-full bg-surface-2 border border-border-subtle rounded-btn px-3 py-2",
          "text-sm text-text-primary placeholder:text-text-tertiary font-sans",
          "focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20",
          "transition-colors duration-150",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          error && "border-danger/50 focus:border-danger/70 focus:ring-danger/20",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger-bright">{error}</p>}
      {hint && !error && <p className="text-xs text-text-tertiary">{hint}</p>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-text-secondary font-sans">{label}</label>
      )}
      <textarea
        className={cn(
          "w-full bg-surface-2 border border-border-subtle rounded-btn px-3 py-2",
          "text-sm text-text-primary placeholder:text-text-tertiary font-sans resize-none",
          "focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20",
          "transition-colors duration-150",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          error && "border-danger/50",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger-bright">{error}</p>}
      {hint && !error && <p className="text-xs text-text-tertiary">{hint}</p>}
    </div>
  );
}
