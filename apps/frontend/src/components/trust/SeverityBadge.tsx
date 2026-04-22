import { cn } from "@/lib/utils";

interface SeverityBadgeProps {
  severity: "INFO" | "WARNING" | "HIGH" | "CRITICAL";
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config = {
    CRITICAL: "bg-danger/20 text-danger-bright border-danger/40 animate-pulse_danger",
    HIGH: "bg-danger/12 text-danger border-danger/25",
    WARNING: "bg-amber/15 text-amber border-amber/30",
    INFO: "bg-steel/15 text-steel-bright border-steel/30",
  }[severity];

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-badge border font-mono text-2xs font-medium tracking-wider",
        config,
        className
      )}
    >
      {severity}
    </span>
  );
}
