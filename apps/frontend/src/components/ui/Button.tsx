import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "amber" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

const variants = {
  primary:
    "bg-amber text-bg border border-transparent font-semibold " +
    "hover:bg-amber-bright active:scale-[0.97] active:-translate-y-px",
  secondary:
    "bg-surface-2 text-text-primary border border-border-subtle " +
    "hover:bg-surface-3 hover:border-border-medium active:scale-[0.97] active:-translate-y-px",
  danger:
    "bg-danger text-white border border-transparent font-semibold " +
    "hover:bg-danger-bright active:scale-[0.97] active:-translate-y-px",
  ghost:
    "bg-transparent text-text-secondary border border-transparent " +
    "hover:text-text-primary hover:bg-surface-2 active:scale-[0.97]",
  amber:
    "bg-transparent text-amber border border-amber/40 " +
    "hover:bg-amber/10 hover:border-amber/70 active:scale-[0.97]",
  outline:
    "bg-transparent text-text-primary border border-border-medium " +
    "hover:bg-surface-2 hover:border-border-medium active:scale-[0.97]",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs rounded-btn gap-1.5",
  md: "px-4 py-2 text-sm rounded-btn gap-2",
  lg: "px-5 py-2.5 text-sm rounded-btn gap-2",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center",
        "transition-[background-color,border-color,color,transform,box-shadow] duration-150",
        "font-sans select-none",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-3.5 w-3.5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
