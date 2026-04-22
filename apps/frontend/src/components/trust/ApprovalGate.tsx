import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, ChevronDown, CheckCircle, XCircle, ExternalLink, Loader2 } from "lucide-react";
import { cardReveal, expandHeight } from "@/lib/motion";
import { SafetyCard } from "./SafetyCard";
import { PolicyDecisionBadge } from "./PolicyDecisionBadge";
import { ReasonCodeChip } from "./ReasonCodeChip";
import { Button } from "@/components/ui/Button";
import { cn, formatBnb } from "@/lib/utils";
import type { Action } from "@/api/task";

interface ApprovalGateProps {
  action: Action;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  onExecute?: () => Promise<void>;
  executionResult?: { txHash?: string; explorerUrl?: string; error?: string };
  disabled?: boolean;
}

export function ApprovalGate({
  action,
  onApprove,
  onReject,
  onExecute,
  executionResult,
  disabled,
}: ApprovalGateProps) {
  const [safetyExpanded, setSafetyExpanded] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [executing, setExecuting] = useState(false);

  const isApproved = action.status === "APPROVED" || action.status === "READY_TO_EXECUTE";
  const isRejected = action.status === "REJECTED";
  const isExecuted = action.status === "EXECUTED";
  const isExecuting = action.status === "EXECUTING";

  async function handleApprove() {
    setApproving(true);
    try { await onApprove(); } finally { setApproving(false); }
  }

  async function handleReject() {
    setRejecting(true);
    try { await onReject(); } finally { setRejecting(false); }
  }

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
      className="rounded-card border border-amber/30 bg-surface-1 overflow-hidden"
      style={{ boxShadow: "0 0 0 1px rgba(212,168,67,0.1), 0 4px 20px rgba(212,168,67,0.06)" }}
    >
      {/* Top bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-amber/60 via-amber to-amber/30" />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-card bg-amber/15 border border-amber/25 flex items-center justify-center shrink-0">
              <ShieldAlert size={15} className="text-amber" />
            </div>
            <div>
              <p className="text-sm font-semibold font-display text-text-primary">
                {isApproved ? "Approved — ready to execute." : isRejected ? "Rejected." : isExecuted ? "Executed." : "Review required."}
              </p>
              <p className="text-xs text-text-secondary font-sans mt-0.5">{action.label}</p>
            </div>
          </div>
          <PolicyDecisionBadge decision={action.policyDecision} size="sm" />
        </div>

        {/* Summary stats */}
        {action.safetyCard && (
          <div className="flex items-center gap-4 text-xs font-mono text-text-secondary">
            <span>Est. <span className="text-text-primary">{formatBnb(action.safetyCard.estimatedSpendBnb)}</span></span>
            <span className="text-border-medium">|</span>
            <span>Risk <span className="text-text-primary">{formatBnb(action.safetyCard.valueAtRiskBnb)}</span></span>
            <span className="text-border-medium">|</span>
            <button
              onClick={() => setSafetyExpanded(!safetyExpanded)}
              className="flex items-center gap-1 text-amber hover:text-amber-bright transition-colors"
            >
              Blast radius
              <motion.div animate={{ rotate: safetyExpanded ? 180 : 0 }} transition={{ duration: 0.15 }}>
                <ChevronDown size={12} />
              </motion.div>
            </button>
          </div>
        )}

        {/* Safety card */}
        <AnimatePresence>
          {action.safetyCard && safetyExpanded && (
            <SafetyCard card={action.safetyCard} expanded={safetyExpanded} variant="approval" />
          )}
        </AnimatePresence>

        {/* Execution result */}
        {executionResult && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-card p-3 border text-xs font-sans",
              executionResult.error
                ? "bg-danger/8 border-danger/25 text-danger-bright"
                : "bg-success/8 border-success/25 text-success"
            )}
          >
            {executionResult.error ? (
              <div className="flex items-start gap-2">
                <XCircle size={13} className="shrink-0 mt-0.5" />
                <span>{executionResult.error}</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle size={13} />
                  <span className="font-medium">Execution confirmed.</span>
                </div>
                {executionResult.txHash && (
                  <p className="font-mono text-2xs text-text-secondary">
                    tx: {executionResult.txHash.slice(0, 20)}...
                  </p>
                )}
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
          </motion.div>
        )}

        {/* Actions */}
        {!isRejected && !isExecuted && (
          <div className="flex items-center gap-2 pt-1">
            {!isApproved && (
              <>
                <Button
                  variant="amber"
                  size="sm"
                  onClick={handleApprove}
                  loading={approving}
                  disabled={disabled || isExecuting}
                  className="flex-1"
                >
                  <CheckCircle size={13} /> Approve
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReject}
                  loading={rejecting}
                  disabled={disabled || isExecuting}
                >
                  <XCircle size={13} /> Reject
                </Button>
              </>
            )}
            {isApproved && onExecute && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecute}
                loading={executing || isExecuting}
                disabled={disabled}
                className="flex-1"
              >
                {executing || isExecuting ? (
                  <><Loader2 size={13} className="animate-spin" /> Executing...</>
                ) : (
                  "Execute action"
                )}
              </Button>
            )}
          </div>
        )}

        {isRejected && (
          <div className="flex items-center gap-2 text-xs text-text-tertiary font-sans pt-1">
            <XCircle size={13} className="text-danger/60" /> Action rejected.
          </div>
        )}

        {isExecuted && (
          <div className="flex items-center gap-2 text-xs text-success font-sans pt-1">
            <CheckCircle size={13} /> Execution confirmed.
          </div>
        )}

        {/* Reason codes */}
        {action.safetyCard?.reasonCodes && action.safetyCard.reasonCodes.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1 border-t border-border-subtle">
            {action.safetyCard.reasonCodes.slice(0, 3).map((code) => (
              <ReasonCodeChip key={code} code={code} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
