import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, FlaskConical, CheckCircle2, XCircle, AlertTriangle, Wallet, FileCode } from "lucide-react";
import { safetyCardExpand, staggerContainer, staggerItem } from "@/lib/motion";
import { ReasonCodeChip } from "./ReasonCodeChip";
import { truncateAddress, formatBnb } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { SafetyCard as SafetyCardType } from "@/api/task";

interface SafetyCardProps {
  card: SafetyCardType;
  expanded?: boolean;
  variant?: "approval" | "auto";
}

function SimulationStatus({ status, success }: { status: string; success: boolean }) {
  if (status === "PASSED" && success) {
    return (
      <span className="inline-flex items-center gap-1 text-success text-xs font-mono">
        <CheckCircle2 size={12} /> PASSED
      </span>
    );
  }
  if (status === "FAILED" || !success) {
    return (
      <span className="inline-flex items-center gap-1 text-danger-bright text-xs font-mono">
        <XCircle size={12} /> FAILED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-text-tertiary text-xs font-mono">
      <FlaskConical size={12} /> {status}
    </span>
  );
}

export function SafetyCard({ card, expanded = true, variant = "approval" }: SafetyCardProps) {
  const borderColor = variant === "approval" ? "border-amber/30" : "border-success/25";
  const headerColor = variant === "approval" ? "text-amber" : "text-success";

  return (
    <AnimatePresence>
      {expanded && (
        <motion.div
          variants={safetyCardExpand}
          initial="initial"
          animate="animate"
          exit="exit"
          className={cn(
            "overflow-hidden rounded-card border bg-surface-1",
            variant === "approval" ? "bg-amber-subtle" : ""
          )}
          style={{ borderColor: variant === "approval" ? "rgba(212,168,67,0.25)" : "rgba(39,174,96,0.2)" }}
        >
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="p-4 space-y-3"
          >
            {/* Header */}
            <motion.div variants={staggerItem} className="flex items-center gap-2">
              <ShieldAlert size={14} className={headerColor} />
              <span className={cn("text-xs font-semibold font-sans", headerColor)}>
                Blast Radius Preview
              </span>
              {card.killSwitchActive && (
                <span className="text-2xs font-mono text-amber bg-amber/10 border border-amber/25 px-1.5 py-0.5 rounded-badge">
                  KILL SWITCH ACTIVE
                </span>
              )}
            </motion.div>

            {/* Key metrics */}
            <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2">
              <MetricRow label="Estimated spend" value={formatBnb(card.estimatedSpendBnb)} emphasis />
              <MetricRow label="Value at risk" value={formatBnb(card.valueAtRiskBnb)} />
              <MetricRow
                label="Simulation"
                value={
                  <SimulationStatus
                    status={card.simulationResult.status}
                    success={card.simulationResult.success}
                  />
                }
              />
              {card.simulationResult.gasEstimate && (
                <MetricRow label="Gas estimate" value={`${card.simulationResult.gasEstimate} gas`} mono />
              )}
            </motion.div>

            {/* Approval scope */}
            {card.approvalScope && (
              <motion.div variants={staggerItem} className="bg-surface-2 rounded-card p-2.5 border border-border-subtle">
                <p className="text-2xs text-text-tertiary font-mono mb-1">Approval scope</p>
                <p className="text-xs text-text-secondary font-sans">{card.approvalScope}</p>
              </motion.div>
            )}

            {/* Risk summary */}
            {card.riskSummary && (
              <motion.div variants={staggerItem} className="flex items-start gap-2">
                <AlertTriangle size={12} className="text-text-tertiary mt-0.5 shrink-0" />
                <p className="text-xs text-text-secondary font-sans">{card.riskSummary}</p>
              </motion.div>
            )}

            {/* Contracts / tokens touched */}
            {card.contractsTouched.length > 0 && (
              <motion.div variants={staggerItem} className="space-y-1">
                <div className="flex items-center gap-1.5 text-2xs text-text-tertiary font-mono uppercase tracking-wider">
                  <FileCode size={11} /> Contracts touched
                </div>
                <div className="flex flex-wrap gap-1">
                  {card.contractsTouched.map((addr) => (
                    <span key={addr} className="text-2xs font-mono text-text-tertiary bg-surface-2 px-1.5 py-0.5 rounded border border-border-subtle">
                      {truncateAddress(addr)}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {card.tokensTouched.length > 0 && (
              <motion.div variants={staggerItem} className="space-y-1">
                <div className="flex items-center gap-1.5 text-2xs text-text-tertiary font-mono uppercase tracking-wider">
                  <Wallet size={11} /> Tokens touched
                </div>
                <div className="flex flex-wrap gap-1">
                  {card.tokensTouched.map((addr) => (
                    <span key={addr} className="text-2xs font-mono text-text-tertiary bg-surface-2 px-1.5 py-0.5 rounded border border-border-subtle">
                      {truncateAddress(addr)}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Reason codes */}
            {card.reasonCodes.length > 0 && (
              <motion.div variants={staggerItem} className="flex flex-wrap gap-1 pt-1 border-t border-border-subtle">
                {card.reasonCodes.map((code) => (
                  <ReasonCodeChip key={code} code={code} />
                ))}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MetricRow({
  label,
  value,
  emphasis,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="bg-surface-2 rounded p-2 border border-border-subtle">
      <p className="text-2xs text-text-tertiary font-mono mb-0.5">{label}</p>
      <div className={cn("text-xs font-medium", mono ? "font-mono" : "font-sans", emphasis ? "text-text-primary" : "text-text-secondary")}>
        {value}
      </div>
    </div>
  );
}
