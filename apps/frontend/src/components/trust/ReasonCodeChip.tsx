import { cn } from "@/lib/utils";

interface ReasonCodeChipProps {
  code: string;
  className?: string;
}

export function ReasonCodeChip({ code, className }: ReasonCodeChipProps) {
  const isVeto = code.startsWith("POLICY_VETO");
  const isExecution = code.startsWith("EXECUTION");
  const isEmergency = code.startsWith("EMERGENCY");

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-badge border font-mono text-2xs tracking-wide",
        isVeto && "bg-danger/10 text-danger border-danger/25",
        isExecution && "bg-amber/10 text-amber-dim border-amber/20",
        isEmergency && "bg-amber/15 text-amber border-amber/30",
        !isVeto && !isExecution && !isEmergency && "bg-surface-3 text-text-tertiary border-border-subtle",
        className
      )}
    >
      {code}
    </span>
  );
}
