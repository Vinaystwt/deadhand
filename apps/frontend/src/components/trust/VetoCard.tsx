import { motion } from "framer-motion";
import { ShieldX, AlertTriangle, Minus } from "lucide-react";
import { vetoReveal, vetoContent, vetoContentItem } from "@/lib/motion";
import { SeverityBadge } from "./SeverityBadge";
import { ReasonCodeChip } from "./ReasonCodeChip";
import { truncateAddress, formatBnb } from "@/lib/utils";
import type { Action } from "@/api/task";

interface VetoCardProps {
  action: Action;
}

export function VetoCard({ action }: VetoCardProps) {
  const receipt = action.decisionReceipt;
  if (!receipt) return null;

  return (
    // Double-bezel outer shell — danger accent
    <div className="bezel-outer-danger">
      <motion.div
        variants={vetoReveal}
        initial="initial"
        animate="animate"
        className="bezel-inner bg-surface-1 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 100% 40% at 50% 0%, rgba(192,57,43,0.08) 0%, transparent 60%), #111113",
        }}
      >
        {/* Top accent bar — full-width danger gradient */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-danger to-transparent opacity-60" />

        <motion.div
          variants={vetoContent}
          initial="initial"
          animate="animate"
          className="p-5 space-y-4"
        >
          {/* Header */}
          <motion.div
            variants={vetoContentItem}
            className="flex items-start justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-card bg-danger/15 border border-danger/30 shrink-0">
                <ShieldX size={16} className="text-danger-bright" />
              </div>
              <div>
                <p className="text-base font-bold text-danger-bright font-display tracking-tight leading-tight">
                  Deadhand blocked this.
                </p>
                <p className="text-2xs text-text-tertiary font-mono mt-0.5">
                  {receipt.primaryReasonCode}
                </p>
              </div>
            </div>
            <SeverityBadge severity={receipt.severity} />
          </motion.div>

          {/* Human explanation */}
          <motion.div
            variants={vetoContentItem}
            className="bg-danger/5 border border-danger/15 rounded-card p-3"
          >
            <p className="text-sm text-text-primary leading-relaxed font-sans">
              {receipt.humanExplanation}
            </p>
          </motion.div>

          {/* Trigger details */}
          {receipt.triggers.length > 0 && (
            <motion.div variants={vetoContentItem} className="space-y-2">
              <p className="text-2xs font-mono text-text-tertiary uppercase tracking-wider">
                Policy violations
              </p>
              {receipt.triggers.map((trigger, i) => (
                <div
                  key={i}
                  className="bg-surface-2 rounded-card p-3 border border-danger/15 space-y-2.5"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <ReasonCodeChip code={trigger.reasonCode} />
                    <span className="text-2xs text-text-tertiary font-mono">
                      {trigger.ruleType}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Field", value: trigger.triggerPath, color: "text-text-secondary" },
                      { label: "Limit", value: String(trigger.expected ?? "—"), color: "text-success" },
                      { label: "Actual", value: String(trigger.actual ?? "—"), color: "text-danger-bright" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-surface-1/60 rounded p-1.5">
                        <p className="text-2xs text-text-tertiary font-mono mb-0.5">{label}</p>
                        <p className={`text-xs font-mono ${color} truncate`}>{value}</p>
                      </div>
                    ))}
                  </div>
                  {trigger.humanExplanation && (
                    <p className="text-xs text-text-secondary font-sans">
                      {trigger.humanExplanation}
                    </p>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* Attempted action */}
          <motion.div variants={vetoContentItem}>
            <p className="text-2xs font-mono text-text-tertiary uppercase tracking-wider mb-2">
              Attempted action
            </p>
            <div className="bg-surface-2 rounded-card p-3 border border-border-subtle">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold font-display text-text-primary tracking-tight">
                  {action.label || receipt.attempted.label}
                </span>
                <span className="text-2xs font-mono text-text-tertiary">
                  {receipt.attempted.actionType}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {[
                  { label: "Cost", value: formatBnb(receipt.attempted.estimatedCostBnb), color: "text-danger-bright" },
                  { label: "Adapter", value: receipt.attempted.adapter, color: "text-text-secondary" },
                  ...(receipt.attempted.targetContractAddress
                    ? [{ label: "Target", value: truncateAddress(receipt.attempted.targetContractAddress), color: "text-text-secondary" }]
                    : []),
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs font-mono">
                    <span className="text-text-tertiary">{label}</span>
                    <span className={color}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Safe alternative */}
          {(receipt.safeAlternative || receipt.requiredCorrection) && (
            <motion.div
              variants={vetoContentItem}
              className="bg-amber/6 border border-amber/20 rounded-card p-3"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle size={12} className="text-amber mt-0.5 shrink-0" />
                <div>
                  <p className="text-2xs font-mono text-amber uppercase tracking-wide mb-1">
                    {receipt.requiredCorrection ? "Required correction" : "Safe alternative"}
                  </p>
                  <p className="text-xs text-text-secondary font-sans leading-relaxed">
                    {receipt.requiredCorrection ?? receipt.safeAlternative}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Footer — firm, final */}
          <motion.div
            variants={vetoContentItem}
            className="flex items-center gap-2 pt-2 border-t border-danger/15"
          >
            <Minus size={10} className="text-danger/40 shrink-0" />
            <p className="text-2xs text-text-tertiary font-mono">
              No override is possible. Permanently blocked by policy enforcement.
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
