import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, CheckCircle, ExternalLink, ChevronDown } from "lucide-react";
import { cardReveal } from "@/lib/motion";
import { SafetyCard } from "./SafetyCard";
import { PolicyDecisionBadge } from "./PolicyDecisionBadge";
import { Button } from "@/components/ui/Button";
import { cn, formatBnb } from "@/lib/utils";
import type { Action } from "@/api/task";

interface AutoApprovedCardProps {
  action: Action;
  onExecute?: () => Promise<void>;
  executionResult?: { txHash?: string; explorerUrl?: string; error?: string };
  disabled?: boolean;
}

export function AutoApprovedCard({ action, onExecute, executionResult, disabled }: AutoApprovedCardProps) {
  const [safetyExpanded, setSafetyExpanded] = useState(false);
  const [executing, setExecuting] = useState(false);

  const isExecuted = action.status === "EXECUTED";

  async function handleExecute() {
    if (!onExecute) return;
    setExecuting(true);
    try { await onExecute(); } finally { setExecuting(false); }
  }

  return (
    <motion.div
      variants={cardReveal}
      initial="initial"
      animate="animate"
      className="rounded-card border border-success/25 bg-surface-1 overflow-hidden"
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-card bg-success/15 border border-success/25 flex items-center justify-center shrink-0">
              <ShieldCheck size={15} className="text-success" />
            </div>
            <div>
              <p className="text-sm font-semibold font-display text-text-primary">Within policy bounds.</p>
              <p className="text-xs text-text-secondary font-sans mt-0.5">{action.label}</p>
            </div>
          </div>
          <PolicyDecisionBadge decision="AUTO_APPROVED" size="sm" />
        </div>

        {/* Summary */}
        {action.safetyCard && (
          <div className="flex items-center gap-4 text-xs font-mono text-text-secondary">
            <span>Est. <span className="text-text-primary">{formatBnb(action.safetyCard.estimatedSpendBnb)}</span></span>
            <span className="text-border-medium">|</span>
            <button
              onClick={() => setSafetyExpanded(!safetyExpanded)}
              className="flex items-center gap-1 text-success hover:text-success-bright transition-colors"
            >
              Safety details
              <motion.div animate={{ rotate: safetyExpanded ? 180 : 0 }} transition={{ duration: 0.15 }}>
                <ChevronDown size={12} />
              </motion.div>
            </button>
          </div>
        )}

        {action.safetyCard && safetyExpanded && (
          <SafetyCard card={action.safetyCard} expanded={safetyExpanded} variant="auto" />
        )}

        {executionResult?.txHash && (
          <div className="bg-success/8 border border-success/25 rounded-card p-3 space-y-1">
            <div className="flex items-center gap-2 text-xs text-success font-sans">
              <CheckCircle size={13} /> Executed.
            </div>
            {executionResult.explorerUrl && (
              <a
                href={executionResult.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-2xs text-steel hover:text-steel-bright font-mono"
              >
                View on BscScan <ExternalLink size={10} />
              </a>
            )}
          </div>
        )}

        {!isExecuted && onExecute && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExecute}
            loading={executing}
            disabled={disabled}
            className="w-full border-success/25 text-success hover:text-success-bright hover:border-success/40"
          >
            Execute action
          </Button>
        )}
      </div>
    </motion.div>
  );
}
