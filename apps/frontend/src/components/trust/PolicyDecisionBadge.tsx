import { cn } from "@/lib/utils";
import { ShieldX, ShieldAlert, ShieldCheck } from "lucide-react";

interface PolicyDecisionBadgeProps {
  decision: "BLOCKED" | "REQUIRES_APPROVAL" | "AUTO_APPROVED";
  size?: "sm" | "md";
  className?: string;
}

export function PolicyDecisionBadge({ decision, size = "md", className }: PolicyDecisionBadgeProps) {
  const config = {
    BLOCKED: {
      icon: ShieldX,
      label: "BLOCKED",
      className: "bg-danger/15 text-danger-bright border-danger/30",
    },
    REQUIRES_APPROVAL: {
      icon: ShieldAlert,
      label: "REQUIRES APPROVAL",
      className: "bg-amber/15 text-amber border-amber/30",
    },
    AUTO_APPROVED: {
      icon: ShieldCheck,
      label: "AUTO APPROVED",
      className: "bg-success/15 text-success border-success/30",
    },
  }[decision];

  const Icon = config.icon;
  const textSize = size === "sm" ? "text-2xs" : "text-xs";
  const iconSize = size === "sm" ? 10 : 12;
  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-badge border font-mono font-medium tracking-wide",
        textSize,
        padding,
        config.className,
        className
      )}
    >
      <Icon size={iconSize} />
      {config.label}
    </span>
  );
}
