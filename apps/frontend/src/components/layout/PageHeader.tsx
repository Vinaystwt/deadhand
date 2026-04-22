import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  actions?: ReactNode;
  action?: ReactNode;
  back?: string;
  className?: string;
}

export function PageHeader({ title, subtitle, description, actions, action, back, className }: PageHeaderProps) {
  const desc = description ?? subtitle;
  const actionEl = action ?? actions;

  return (
    <div className={cn("mb-6", className)}>
      {back && (
        <Link
          to={back}
          className="inline-flex items-center gap-1 text-2xs font-mono text-text-tertiary hover:text-text-secondary transition-colors mb-3"
        >
          <ChevronLeft size={11} /> Back
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-display text-text-primary tracking-tight">{title}</h1>
          {desc && <p className="text-sm text-text-secondary font-sans mt-0.5">{desc}</p>}
        </div>
        {actionEl && <div className="flex items-center gap-2 shrink-0">{actionEl}</div>}
      </div>
    </div>
  );
}
