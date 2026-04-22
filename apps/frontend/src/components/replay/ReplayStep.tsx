import { motion } from "framer-motion";
import { replayStep } from "@/lib/motion";
import { ReasonCodeChip } from "@/components/trust/ReasonCodeChip";
import { cn } from "@/lib/utils";
import {
  Target, Brain, ListChecks, ShieldX, ShieldAlert, FlaskConical,
  Lock, CheckCircle, AlertOctagon, Code2, Download, Circle, type LucideIcon
} from "lucide-react";
import type { ReplayStep as ReplayStepType } from "@/api/task";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const stepConfig: Record<string, {
  icon: LucideIcon;
  color: string;
  lineColor: string;
  bg: string;
  label: string;
}> = {
  GOAL: { icon: Target, color: "text-steel-bright", lineColor: "bg-steel/40", bg: "bg-steel/10 border-steel/25", label: "Goal" },
  INTENT: { icon: Brain, color: "text-steel-bright", lineColor: "bg-steel/40", bg: "bg-steel/10 border-steel/25", label: "Intent parsed" },
  ACTION_PLAN: { icon: ListChecks, color: "text-text-secondary", lineColor: "bg-border-medium", bg: "bg-surface-2 border-border-subtle", label: "Action plan" },
  DEADHAND_VETO: { icon: ShieldX, color: "text-danger-bright", lineColor: "bg-danger/50", bg: "bg-danger/10 border-danger/30", label: "Veto" },
  APPROVAL_GATE: { icon: ShieldAlert, color: "text-amber", lineColor: "bg-amber/50", bg: "bg-amber/10 border-amber/30", label: "Approval gate" },
  SIMULATION: { icon: FlaskConical, color: "text-text-secondary", lineColor: "bg-border-medium", bg: "bg-surface-2 border-border-subtle", label: "Simulation" },
  EXECUTION_GUARD: { icon: Lock, color: "text-steel-bright", lineColor: "bg-steel/40", bg: "bg-steel/10 border-steel/25", label: "Execution guard" },
  EXECUTION_RESULT: { icon: CheckCircle, color: "text-success", lineColor: "bg-success/40", bg: "bg-success/8 border-success/25", label: "Result" },
  EMERGENCY_STOP: { icon: AlertOctagon, color: "text-amber", lineColor: "bg-amber/50", bg: "bg-amber/10 border-amber/30", label: "Emergency stop" },
  POLICY_COMPILER: { icon: Code2, color: "text-amber", lineColor: "bg-amber/50", bg: "bg-amber/10 border-amber/25", label: "Policy compiler" },
  AUDIT_EXPORT: { icon: Download, color: "text-text-secondary", lineColor: "bg-border-medium", bg: "bg-surface-2 border-border-subtle", label: "Export" },
};

const defaultConfig: { icon: LucideIcon; color: string; lineColor: string; bg: string; label: string } = {
  icon: Circle, color: "text-text-tertiary", lineColor: "bg-border-subtle", bg: "bg-surface-2 border-border-subtle", label: "Step"
};

interface ReplayStepProps {
  step: ReplayStepType;
  index: number;
  isLast: boolean;
}

export function ReplayStepComponent({ step, index, isLast }: ReplayStepProps) {
  const [payloadOpen, setPayloadOpen] = useState(false);
  const config = stepConfig[step.type] ?? defaultConfig;
  const Icon = config.icon;

  const hasPayload = Object.keys(step.payload ?? {}).length > 0;
  const isVeto = step.type === "DEADHAND_VETO";

  return (
    <motion.div
      variants={replayStep}
      className="flex gap-4"
    >
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "w-8 h-8 rounded-card border flex items-center justify-center shrink-0",
          config.bg,
          isVeto && "shadow-danger-glow"
        )}>
          <Icon size={14} className={config.color} />
        </div>
        {!isLast && (
          <div className={cn("w-0.5 flex-1 mt-1", config.lineColor, "min-h-[24px]")} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-5 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xs font-mono text-text-tertiary uppercase tracking-wider">{config.label}</span>
          <span className="text-2xs font-mono text-text-tertiary">#{index + 1}</span>
        </div>

        <p className={cn(
          "text-sm font-semibold font-display mb-1",
          isVeto ? "text-danger-bright" : "text-text-primary"
        )}>
          {step.title}
        </p>

        <p className="text-xs text-text-secondary font-sans leading-relaxed">{step.summary}</p>

        {/* Reason codes */}
        {step.reasonCodes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {step.reasonCodes.map((code) => (
              <ReasonCodeChip key={code} code={code} />
            ))}
          </div>
        )}

        {/* Payload toggle */}
        {hasPayload && (
          <div className="mt-2">
            <button
              onClick={() => setPayloadOpen(!payloadOpen)}
              className="flex items-center gap-1 text-2xs font-mono text-text-tertiary hover:text-text-secondary transition-colors"
            >
              <motion.div animate={{ rotate: payloadOpen ? 180 : 0 }} transition={{ duration: 0.15 }}>
                <ChevronDown size={11} />
              </motion.div>
              {payloadOpen ? "Hide" : "Show"} payload
            </button>
            {payloadOpen && (
              <motion.pre
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-2 text-2xs font-mono text-text-tertiary bg-surface-2 border border-border-subtle rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap"
              >
                {JSON.stringify(step.payload, null, 2)}
              </motion.pre>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
