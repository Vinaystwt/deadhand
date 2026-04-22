import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "amber" | "danger" | "success" | "elevated";
  children: ReactNode;
}

const variants = {
  default: "bg-surface-1 border border-border-subtle",
  amber: "bg-surface-1 border border-amber/30 shadow-amber-glow",
  danger: "bg-surface-1 border border-danger/40 shadow-danger-glow bg-danger-subtle",
  success: "bg-surface-1 border border-success/30",
  elevated: "bg-surface-2 border border-border-subtle shadow-elevated",
};

export function Card({ variant = "default", children, className, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-card p-4 shadow-card", variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 mb-3", className)}>
      {children}
    </div>
  );
}

export function CardSection({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("py-3 border-t border-border-subtle first:border-t-0 first:pt-0", className)}>
      {children}
    </div>
  );
}
