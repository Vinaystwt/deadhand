import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface BadgeProps {
  variant?: "default" | "amber" | "danger" | "success" | "steel" | "outline";
  size?: "sm" | "md";
  children: ReactNode;
  className?: string;
}

const variants = {
  default: "bg-surface-3 text-text-secondary border-border-subtle",
  amber: "bg-amber/15 text-amber border-amber/30",
  danger: "bg-danger/15 text-danger-bright border-danger/30",
  success: "bg-success/15 text-success-bright border-success/30",
  steel: "bg-steel/15 text-steel-bright border-steel/30",
  outline: "bg-transparent text-text-secondary border-border-medium",
};

const sizes = {
  sm: "px-1.5 py-0.5 text-2xs",
  md: "px-2 py-0.5 text-xs",
};

export function Badge({ variant = "default", size = "md", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-badge border font-sans font-medium",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
